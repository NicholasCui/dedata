package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/dedata/dedata-backend/config"
	"github.com/dedata/dedata-backend/internal/domain/entity"
	"github.com/dedata/dedata-backend/internal/domain/repository"
	"github.com/dedata/dedata-backend/internal/infrastructure/external"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type CheckInUseCase struct {
	checkinRepo repository.CheckInRepository
	userRepo    repository.UserRepository
	x402Client  external.X402Client
	config      *config.CheckInConfig
	logger      *zap.Logger
}

func NewCheckInUseCase(
	checkinRepo repository.CheckInRepository,
	userRepo repository.UserRepository,
	x402Client external.X402Client,
	cfg *config.CheckInConfig,
	logger *zap.Logger,
) *CheckInUseCase {
	return &CheckInUseCase{
		checkinRepo: checkinRepo,
		userRepo:    userRepo,
		x402Client:  x402Client,
		config:      cfg,
		logger:      logger,
	}
}

// CheckIn 发起签到
func (uc *CheckInUseCase) CheckIn(ctx context.Context, userID string) (*entity.CheckIn, *external.X402Challenge, error) {
	// 1. 查找用户
	_, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, fmt.Errorf("user not found")
		}
		return nil, nil, fmt.Errorf("failed to find user: %w", err)
	}

	// 2. 检查今天是否已经签到成功
	hasCheckedIn, err := uc.checkinRepo.CheckTodayCheckin(ctx, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to check today checkin: %w", err)
	}
	if hasCheckedIn {
		fmt.Printf("already checked in")
		//return nil, nil, fmt.Errorf("already checked in today")
	}

	// 3. 检查是否有正在进行的签到（等待支付或正在发放）
	existingPending, err := uc.checkinRepo.FindPendingPaymentByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, fmt.Errorf("failed to check pending payment: %w", err)
	}
	if existingPending != nil {
		// 检查支付挑战是否已过期（过期时间1分钟）
		if existingPending.PaymentExpiresAt != nil && time.Now().Before(*existingPending.PaymentExpiresAt) {
			// 未过期，返回现有的支付挑战
			challenge := &external.X402Challenge{
				OrderID:        *existingPending.OrderID,
				PaymentAddress: *existingPending.PaymentAddress,
				PriceAmount:    *existingPending.PriceAmount,
				BlockchainName: *existingPending.BlockchainName,
				TokenSymbol:    *existingPending.TokenSymbol,
				ExpiresAt:      existingPending.PaymentExpiresAt.Format(time.RFC3339),
			}
			return existingPending, challenge, nil
		} else {
			// 已过期，更新状态为 payment_failed
			existingPending.Status = entity.CheckInPaymentFailed
			existingPending.FailureReason = ptr("Payment challenge expired")
			if err := uc.checkinRepo.Update(ctx, existingPending); err != nil {
				uc.logger.Warn("Failed to update expired checkin status",
					zap.String("checkin_id", existingPending.ID),
					zap.Error(err),
				)
			}
			// 继续创建新的支付挑战
		}
	}

	existingIssuing, err := uc.checkinRepo.FindIssuingByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, fmt.Errorf("failed to check issuing status: %w", err)
	}
	if existingIssuing != nil {
		return nil, nil, fmt.Errorf("you have a checkin in progress, please wait")
	}

	// 4. 调用 x402 的 daily-checkin API（固定 0.01 美元 Polygon USDT）
	statusCode, respBody, err := uc.x402Client.DailyCheckin(ctx, userID)
	if err != nil {
		uc.logger.Error("Failed to call x402 daily-checkin", zap.Error(err))
		return nil, nil, fmt.Errorf("failed to call daily-checkin: %w", err)
	}

	// 5. 处理响应
	// 如果返回 200，说明 x402 那边已经签到过了（理论上不会走到这里，因为我们上面已经检查过了）
	if statusCode == 200 {
		return nil, nil, fmt.Errorf("already checked in today")
	}

	// 如果返回 402，解析支付挑战
	if statusCode == 402 {
		var x402Resp external.X402Response
		if err := json.Unmarshal(respBody, &x402Resp); err != nil {
			uc.logger.Error("Failed to unmarshal x402 response", zap.Error(err))
			return nil, nil, fmt.Errorf("failed to parse x402 response: %w", err)
		}

		var paymentData external.X402PaymentData
		if err := json.Unmarshal(x402Resp.Data, &paymentData); err != nil {
			uc.logger.Error("Failed to unmarshal payment data", zap.Error(err))
			return nil, nil, fmt.Errorf("failed to parse payment data: %w", err)
		}

		challenge := &paymentData.L402Challenge

		// 6. 解析过期时间
		expiresAt, err := time.Parse(time.RFC3339, challenge.ExpiresAt)
		if err != nil {
			uc.logger.Warn("Failed to parse expires_at", zap.Error(err))
			expiresAt = time.Now().Add(30 * time.Minute) // 默认30分钟
		}

		// 7. 创建 pending_payment 记录
		checkin := &entity.CheckIn{
			UserID:           userID,
			Status:           entity.CheckInPendingPayment,
			OrderID:          &challenge.OrderID,
			PaymentAddress:   &challenge.PaymentAddress,
			PriceAmount:      &challenge.PriceAmount,
			BlockchainName:   &challenge.BlockchainName,
			TokenSymbol:      &challenge.TokenSymbol,
			PaymentExpiresAt: &expiresAt,
		}

		if err := uc.checkinRepo.Create(ctx, checkin); err != nil {
			return nil, nil, fmt.Errorf("failed to create checkin record: %w", err)
		}

		uc.logger.Info("CheckIn payment challenge created",
			zap.String("userID", userID),
			zap.String("checkinID", checkin.ID),
			zap.String("orderID", challenge.OrderID),
		)

		return checkin, challenge, nil
	}

	// 其他状态码视为错误
	uc.logger.Error("Unexpected status code from x402 daily-checkin",
		zap.Int("status_code", statusCode),
		zap.String("response", string(respBody)),
	)
	return nil, nil, fmt.Errorf("unexpected response from x402: status %d", statusCode)
}

// GetMyCheckIns 获取我的签到记录
func (uc *CheckInUseCase) GetMyCheckIns(ctx context.Context, userID string, page, pageSize int) ([]*entity.CheckIn, int64, error) {
	offset := (page - 1) * pageSize
	return uc.checkinRepo.FindByUserID(ctx, userID, pageSize, offset)
}

// GetCheckInSummary 获取签到统计
func (uc *CheckInUseCase) GetCheckInSummary(ctx context.Context, userID string) (map[string]interface{}, error) {
	// 获取用户信息
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// 1. 检查今日是否已签到
	checkedInToday, err := uc.checkinRepo.CheckTodayCheckin(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check today checkin: %w", err)
	}

	// 2. 获取签到总次数
	totalCheckins, err := uc.checkinRepo.CountSuccessCheckinsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total checkins: %w", err)
	}

	// 3. 获取用户排名
	rank, err := uc.userRepo.GetUserRankByRewards(ctx, userID)
	if err != nil {
		uc.logger.Warn("Failed to get user rank, using 0",
			zap.String("user_id", userID),
			zap.Error(err),
		)
		rank = 0 // 如果获取失败，设置为0
	}

	// 4. 获取每日统计（可选，用于展示日历等）
	dailyStats, err := uc.checkinRepo.GetDailyStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily stats: %w", err)
	}

	summary := map[string]interface{}{
		"checkedInToday": checkedInToday,     // 今日是否已签到
		"totalRewards":   user.TotalRewards,  // 签到总获取的tokens数
		"totalCheckins":  totalCheckins,      // 签到总次数
		"rank":           rank,               // 总排名
		"lastCheckinAt":  user.LastCheckinAt, // 最后签到时间
		"dailyStats":     dailyStats,         // 每日统计（日历展示等）
	}

	return summary, nil
}

// VerifyCheckin 验证签到支付
func (uc *CheckInUseCase) VerifyCheckin(ctx context.Context, orderID, userID string) (bool, string, error) {
	// 1. 查找签到记录
	checkin, err := uc.checkinRepo.FindByOrderID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, "checkin not found", fmt.Errorf("checkin not found for order_id: %s", orderID)
		}
		return false, "", fmt.Errorf("failed to find checkin: %w", err)
	}

	// 2. 验证用户ID
	if checkin.UserID != userID {
		return false, "unauthorized", fmt.Errorf("checkin does not belong to user")
	}

	// 3. 如果已经支付成功或更高状态，直接返回成功
	if checkin.Status == entity.CheckInPaymentSuccess ||
		checkin.Status == entity.CheckInIssuing ||
		checkin.Status == entity.CheckInSuccess {
		return true, "payment verified", nil
	}

	// 4. 如果不是pending_payment状态，返回错误
	if checkin.Status != entity.CheckInPendingPayment {
		return false, string(checkin.Status), fmt.Errorf("invalid checkin status: %s", checkin.Status)
	}

	// 5. 调用 x402 验证支付
	success, message, err := uc.x402Client.VerifyPayment(ctx, orderID, userID)
	if err != nil {
		uc.logger.Error("Failed to verify payment", zap.Error(err))
		return false, "", fmt.Errorf("failed to verify payment: %w", err)
	}

	// 6. 如果支付成功，更新状态为 payment_success
	if success {
		checkin.Status = entity.CheckInPaymentSuccess
		if err := uc.checkinRepo.Update(ctx, checkin); err != nil {
			uc.logger.Error("Failed to update checkin status", zap.Error(err))
			return false, "", fmt.Errorf("failed to update checkin status: %w", err)
		}

		uc.logger.Info("Payment verified successfully",
			zap.String("order_id", orderID),
			zap.String("user_id", userID),
		)
	}

	return success, message, nil
}

// ptr 辅助函数,返回字符串指针
func ptr(s string) *string {
	return &s
}
