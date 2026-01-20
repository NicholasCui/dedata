package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/dedata/dedata-backend/config"
	"github.com/dedata/dedata-backend/internal/domain/entity"
	"github.com/dedata/dedata-backend/internal/domain/repository"
	"github.com/dedata/dedata-backend/internal/infrastructure/external"
	"go.uber.org/zap"
)

// CheckinWorker 签到 Worker,负责异步发放 token
type CheckinWorker struct {
	checkinRepo repository.CheckInRepository
	userRepo    repository.UserRepository
	tokenIssuer external.TokenIssuer
	config      *config.CheckInConfig
	logger      *zap.Logger
	interval    time.Duration
}

// NewCheckinWorker 创建签到 Worker
func NewCheckinWorker(
	checkinRepo repository.CheckInRepository,
	userRepo repository.UserRepository,
	tokenIssuer external.TokenIssuer,
	cfg *config.CheckInConfig,
	logger *zap.Logger,
) *CheckinWorker {
	interval := time.Duration(cfg.WorkerInterval) * time.Second
	if interval == 0 {
		interval = 30 * time.Second // 默认30秒
	}

	return &CheckinWorker{
		checkinRepo: checkinRepo,
		userRepo:    userRepo,
		tokenIssuer: tokenIssuer,
		config:      cfg,
		logger:      logger,
		interval:    interval,
	}
}

// Run 启动 Worker
func (w *CheckinWorker) Run(ctx context.Context) {
	w.logger.Info("CheckinWorker started", zap.Duration("interval", w.interval))

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	// 启动时立即执行一次
	w.processPaymentSuccessRecords(ctx)

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("CheckinWorker stopped")
			return
		case <-ticker.C:
			w.processPaymentSuccessRecords(ctx)
		}
	}
}

// processPaymentSuccessRecords 处理所有支付成功和正在发放的记录
func (w *CheckinWorker) processPaymentSuccessRecords(ctx context.Context) {
	// 查找所有 payment_success 状态的记录
	paymentSuccessRecords, err := w.checkinRepo.FindPaymentSuccessRecords(ctx)
	if err != nil {
		w.logger.Error("Failed to find payment success records", zap.Error(err))
		return
	}

	// 查找所有 issuing 状态的记录（服务重启恢复场景）
	issuingRecords, err := w.checkinRepo.FindIssuingRecords(ctx)
	if err != nil {
		w.logger.Error("Failed to find issuing records", zap.Error(err))
		return
	}

	// 合并两个列表
	records := append(paymentSuccessRecords, issuingRecords...)

	if len(records) == 0 {
		return
	}

	w.logger.Info("Processing records",
		zap.Int("payment_success_count", len(paymentSuccessRecords)),
		zap.Int("issuing_count", len(issuingRecords)),
		zap.Int("total_count", len(records)),
	)

	// 处理每条记录
	for _, record := range records {
		if err := w.processOne(ctx, record); err != nil {
			w.logger.Error("Failed to process checkin",
				zap.String("checkinID", record.ID),
				zap.String("userID", record.UserID),
				zap.String("status", string(record.Status)),
				zap.Error(err),
			)
		}
	}
}

// processOne 处理单条签到记录
func (w *CheckinWorker) processOne(ctx context.Context, checkin *entity.CheckIn) error {
	logger := w.logger.With(
		zap.String("checkinID", checkin.ID),
		zap.String("userID", checkin.UserID),
	)

	// 1. 检查重试次数
	if checkin.RetryCount >= w.config.MaxRetryCount {
		logger.Warn("Max retry count reached, marking as issue_failed",
			zap.Int("retry_count", checkin.RetryCount),
		)
		return w.checkinRepo.MarkFailed(ctx, checkin.ID, "max retry count reached")
	}

	// 2. 检查是否已经有交易哈希（服务重启恢复场景）
	if checkin.IssueTxHash != nil && *checkin.IssueTxHash != "" {
		logger.Info("Found existing transaction hash, checking status",
			zap.String("tx_hash", *checkin.IssueTxHash),
		)

		status, err := w.tokenIssuer.CheckTransactionStatus(ctx, *checkin.IssueTxHash)
		if err != nil {
			logger.Error("Failed to check transaction status",
				zap.String("tx_hash", *checkin.IssueTxHash),
				zap.Error(err),
			)
			// 检查失败，继续发送新交易
		} else {
			// 根据交易状态处理
			if status.Success {
				// 交易已经成功，直接标记为成功
				logger.Info("Transaction already confirmed successfully",
					zap.String("tx_hash", *checkin.IssueTxHash),
					zap.Uint64("block", status.BlockNumber),
				)
				rewardAmount := w.config.RewardAmount
				if err := w.checkinRepo.MarkSuccess(ctx, checkin.ID, *checkin.IssueTxHash, rewardAmount); err != nil {
					return fmt.Errorf("failed to mark success: %w", err)
				}
				// 更新用户的 total_rewards 和 last_checkin_at
				if err := w.userRepo.UpdateTokensAndCheckin(ctx, checkin.UserID, rewardAmount, time.Now()); err != nil {
					logger.Error("Failed to update user tokens", zap.Error(err))
				}
				return nil
			} else if status.Failed {
				// 交易已经失败，重新发送
				logger.Warn("Previous transaction failed on chain, will retry",
					zap.String("tx_hash", *checkin.IssueTxHash),
					zap.Uint64("block", status.BlockNumber),
				)
				// 清空旧的tx_hash，准备发送新交易
				checkin.IssueTxHash = nil
			} else if status.Pending {
				// 交易还在pending，继续等待（保持issuing状态）
				logger.Info("Transaction still pending, will wait",
					zap.String("tx_hash", *checkin.IssueTxHash),
				)
				// 更新状态为issuing，确保下次继续检查
				if err := w.checkinRepo.UpdateStatus(ctx, checkin.ID, entity.CheckInIssuing); err != nil {
					logger.Error("Failed to update status", zap.Error(err))
				}
				return nil
			} else if !status.Found {
				// 交易不存在（可能被丢弃），重新发送
				logger.Warn("Previous transaction not found in network, will retry",
					zap.String("tx_hash", *checkin.IssueTxHash),
				)
				// 清空旧的tx_hash，准备发送新交易
				checkin.IssueTxHash = nil
			}
		}
	}

	// 3. 更新状态为 issuing
	if err := w.checkinRepo.UpdateStatus(ctx, checkin.ID, entity.CheckInIssuing); err != nil {
		return fmt.Errorf("failed to update status to issuing: %w", err)
	}

	// 4. 查找用户
	user, err := w.userRepo.FindByID(ctx, checkin.UserID)
	if err != nil {
		// 标记为失败
		w.checkinRepo.MarkFailed(ctx, checkin.ID, fmt.Sprintf("user not found: %v", err))
		return fmt.Errorf("failed to find user: %w", err)
	}

	// 5. 发放 token
	rewardAmount := w.config.RewardAmount
	txHash, err := w.tokenIssuer.IssueToken(ctx, user.WalletAddress, rewardAmount)
	if err != nil {
		// 发放失败，增加重试次数
		checkin.RetryCount++
		checkin.Status = entity.CheckInPaymentSuccess // 回退到 payment_success 状态
		checkin.FailureReason = ptr(err.Error())

		if updateErr := w.checkinRepo.Update(ctx, checkin); updateErr != nil {
			logger.Error("Failed to update retry count", zap.Error(updateErr))
		}

		return fmt.Errorf("failed to issue token: %w", err)
	}

	// 6. 立即保存 tx_hash，但保持 issuing 状态
	checkin.IssueTxHash = &txHash
	checkin.Status = entity.CheckInIssuing
	if err := w.checkinRepo.Update(ctx, checkin); err != nil {
		logger.Error("Failed to save tx_hash",
			zap.String("tx_hash", txHash),
			zap.Error(err),
		)
		// 继续执行，下次会检查交易状态
	}

	logger.Info("Transaction sent and tx_hash saved, will check status in next poll",
		zap.String("tx_hash", txHash),
		zap.String("amount", rewardAmount),
	)

	// 立即检查交易状态
	status, err := w.tokenIssuer.CheckTransactionStatus(ctx, txHash)
	if err != nil {
		logger.Warn("Failed to check transaction status immediately", zap.Error(err))
		return nil // 下次轮询会继续检查
	}

	if status.Success {
		// 交易已经成功（快速确认）
		logger.Info("Transaction confirmed immediately",
			zap.String("tx_hash", txHash),
			zap.Uint64("block", status.BlockNumber),
		)

		// 标记为成功
		if err := w.checkinRepo.MarkSuccess(ctx, checkin.ID, txHash, rewardAmount); err != nil {
			logger.Error("Failed to mark success", zap.Error(err))
			return fmt.Errorf("failed to mark success: %w", err)
		}

		// 更新用户的 total_rewards 和 last_checkin_at
		if err := w.userRepo.UpdateTokensAndCheckin(ctx, checkin.UserID, rewardAmount, time.Now()); err != nil {
			logger.Error("Failed to update user tokens", zap.Error(err))
		}

		logger.Info("Checkin processed successfully",
			zap.String("tx_hash", txHash),
			zap.String("amount", rewardAmount),
		)
	} else if status.Pending {
		logger.Info("Transaction pending, will check in next poll",
			zap.String("tx_hash", txHash),
		)
	}

	return nil
}

func ptr(s string) *string {
	return &s
}
