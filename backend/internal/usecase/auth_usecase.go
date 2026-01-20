package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"github.com/dedata/dedata-backend/internal/domain/repository"
	dbRepo "github.com/dedata/dedata-backend/internal/infrastructure/database"
	"github.com/dedata/dedata-backend/internal/interface/dto"
	"github.com/dedata/dedata-backend/pkg/crypto"
	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type AuthUseCase struct {
	authRepo repository.AuthRepository
	userRepo repository.UserRepository
	jwtMgr   *pkgJWT.JWTManager
	logger   *zap.Logger
}

func NewAuthUseCase(
	authRepo repository.AuthRepository,
	userRepo repository.UserRepository,
	jwtMgr *pkgJWT.JWTManager,
	logger *zap.Logger,
) *AuthUseCase {
	return &AuthUseCase{
		authRepo: authRepo,
		userRepo: userRepo,
		jwtMgr:   jwtMgr,
		logger:   logger,
	}
}

// GenerateNonce 生成 nonce
func (uc *AuthUseCase) GenerateNonce(ctx context.Context, req *dto.NonceRequest) (*dto.NonceResponse, error) {
	// 1. 生成随机 nonce
	nonce, err := crypto.GenerateNonce()
	if err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// 2. 创建 challenge (简化版，只存储必要信息)
	now := time.Now()
	expiresAt := now.Add(5 * time.Minute)

	challenge := &entity.LoginChallenge{
		Address:   req.Address,
		Nonce:     nonce,
		Used:      false,
		ExpiresAt: expiresAt,
	}

	if err := uc.authRepo.CreateChallenge(ctx, challenge); err != nil {
		return nil, fmt.Errorf("failed to create challenge: %w", err)
	}

	// 3. 返回 nonce (前端自己构造消息)
	return &dto.NonceResponse{
		Nonce: nonce,
	}, nil
}

// VerifySignature 验证签名并登录/注册
func (uc *AuthUseCase) VerifySignature(ctx context.Context, req *dto.VerifyRequest) (*dto.AuthResponse, error) {
	uc.logger.Info("VerifySignature called",
		zap.String("address", req.Address),
		zap.String("nonce", req.Nonce),
		zap.String("signature", req.Signature),
		zap.String("message", req.Message),
	)

	// 1. 查找 challenge
	challenge, err := uc.authRepo.FindChallengeByNonce(ctx, req.Nonce)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			uc.logger.Warn("Nonce not found", zap.String("nonce", req.Nonce))
			return nil, fmt.Errorf("nonce not found or expired")
		}
		return nil, fmt.Errorf("failed to find challenge: %w", err)
	}

	uc.logger.Info("Challenge found",
		zap.String("challenge_address", challenge.Address),
		zap.String("challenge_nonce", challenge.Nonce),
		zap.Time("expires_at", challenge.ExpiresAt),
		zap.Bool("used", challenge.Used),
	)

	// 2. 验证 challenge
	if challenge.IsExpired() {
		uc.logger.Warn("Nonce expired", zap.String("nonce", req.Nonce))
		return nil, fmt.Errorf("nonce has expired")
	}

	if challenge.IsUsed() {
		uc.logger.Warn("Nonce already used", zap.String("nonce", req.Nonce))
		return nil, fmt.Errorf("nonce has already been used")
	}

	// 3. 验证地址匹配
	if strings.ToLower(challenge.Address) != strings.ToLower(req.Address) {
		uc.logger.Warn("Address mismatch",
			zap.String("challenge_address", challenge.Address),
			zap.String("request_address", req.Address),
		)
		return nil, fmt.Errorf("address mismatch")
	}

	// 4. 构造期望的消息（如果前端没传，就自己构造）
	expectedMessage := req.Message
	if expectedMessage == "" {
		expectedMessage = fmt.Sprintf("Sign this message to authenticate with DeData Protocol\n\nNonce: %s", req.Nonce)
	}

	uc.logger.Info("Verifying signature",
		zap.String("message", expectedMessage),
		zap.String("signature", req.Signature),
		zap.String("address", req.Address),
	)

	// 5. 验证签名
	valid, err := crypto.VerifySignature(expectedMessage, req.Signature, req.Address)
	if err != nil {
		uc.logger.Error("Signature verification error", zap.Error(err))
		return nil, fmt.Errorf("failed to verify signature: %w", err)
	}

	if !valid {
		// 尝试恢复地址看看签名是否有效
		recoveredAddr, recErr := crypto.RecoverAddress(expectedMessage, req.Signature)
		uc.logger.Warn("Invalid signature",
			zap.String("expected_address", req.Address),
			zap.String("recovered_address", recoveredAddr),
			zap.Error(recErr),
		)
		return nil, fmt.Errorf("invalid signature")
	}

	uc.logger.Info("Signature verified successfully")

	// 6. 标记 nonce 为已使用
	if err := uc.authRepo.MarkChallengeAsUsed(ctx, req.Nonce); err != nil {
		uc.logger.Error("Failed to mark challenge as used", zap.Error(err))
	}

	// 7. 查找或创建用户
	user, err := uc.userRepo.FindByAddress(ctx, req.Address)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新用户
			user = &entity.User{
				DID:              dbRepo.GenerateDID(req.Address),
				WalletAddress:    req.Address,
				ChainID:          1, // 默认 Ethereum mainnet，可以从前端传入
				Role:             entity.RoleUser,
				Status:           entity.StatusActive,
				ProfileCompleted: false,
			}

			if err := uc.userRepo.Create(ctx, user); err != nil {
				return nil, fmt.Errorf("failed to create user: %w", err)
			}

			uc.logger.Info("New user registered", zap.String("address", req.Address))
		} else {
			return nil, fmt.Errorf("failed to find user: %w", err)
		}
	}

	// 8. 生成 JWT
	token, err := uc.jwtMgr.GenerateToken(user.ID, user.WalletAddress, user.DID, string(user.Role))
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &dto.AuthResponse{
		Token: token,
		User: &dto.UserInfo{
			ID:               user.ID,
			Address:          user.WalletAddress,
			DID:              user.DID,
			Role:             string(user.Role),
			ProfileCompleted: user.ProfileCompleted,
		},
	}, nil
}
