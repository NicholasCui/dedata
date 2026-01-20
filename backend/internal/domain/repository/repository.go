package repository

import (
	"context"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
)

// UserRepository 用户仓储接口
type UserRepository interface {
	// FindByAddress 通过地址查找用户
	FindByAddress(ctx context.Context, address string) (*entity.User, error)

	// FindByDID 通过 DID 查找用户
	FindByDID(ctx context.Context, did string) (*entity.User, error)

	// FindByID 通过 ID 查找用户
	FindByID(ctx context.Context, id string) (*entity.User, error)

	// Create 创建用户
	Create(ctx context.Context, user *entity.User) error

	// Update 更新用户
	Update(ctx context.Context, user *entity.User) error

	// UpdateTokensAndCheckin 更新用户 token 和最后签到时间
	UpdateTokensAndCheckin(ctx context.Context, userID string, addTokens string, checkinTime time.Time) error

	// GetLeaderboard 获取排行榜（分页）
	GetLeaderboard(ctx context.Context, page, limit int) ([]*entity.User, int64, error)

	// GetUserRankByRewards 获取用户根据 total_rewards 的排名
	GetUserRankByRewards(ctx context.Context, userID string) (int, error)
}

// AuthRepository 认证仓储接口
type AuthRepository interface {
	// CreateChallenge 创建登录挑战
	CreateChallenge(ctx context.Context, challenge *entity.LoginChallenge) error

	// FindChallengeByNonce 通过 nonce 查找挑战
	FindChallengeByNonce(ctx context.Context, nonce string) (*entity.LoginChallenge, error)

	// MarkChallengeAsUsed 标记挑战为已使用
	MarkChallengeAsUsed(ctx context.Context, nonce string) error

	// DeleteExpiredChallenges 删除过期的挑战
	DeleteExpiredChallenges(ctx context.Context) error
}

// ProfileRepository Profile 仓储接口
type ProfileRepository interface {
	// FindByUserID 通过用户 ID 查找 Profile
	FindByUserID(ctx context.Context, userID string) (*entity.Profile, error)

	// FindByUserIDs 批量查询用户的 Profiles
	FindByUserIDs(ctx context.Context, userIDs []string) (map[string]*entity.Profile, error)

	// Create 创建 Profile
	Create(ctx context.Context, profile *entity.Profile) error

	// Update 更新 Profile
	Update(ctx context.Context, profile *entity.Profile) error

	// Upsert 更新或创建 Profile
	Upsert(ctx context.Context, profile *entity.Profile) error
}

// CheckInRepository 签到仓储接口
type CheckInRepository interface {
	// Create 创建签到记录
	Create(ctx context.Context, checkIn *entity.CheckIn) error

	// FindByID 通过 ID 查找
	FindByID(ctx context.Context, id string) (*entity.CheckIn, error)

	// FindByOrderID 通过 order_id 查找
	FindByOrderID(ctx context.Context, orderID string) (*entity.CheckIn, error)

	// FindPendingPaymentByUserID 查找用户等待支付的签到
	FindPendingPaymentByUserID(ctx context.Context, userID string) (*entity.CheckIn, error)

	// FindIssuingByUserID 查找用户正在发放中的签到
	FindIssuingByUserID(ctx context.Context, userID string) (*entity.CheckIn, error)

	// FindIssuingRecords 查找所有正在发放中的记录
	FindIssuingRecords(ctx context.Context) ([]*entity.CheckIn, error)

	// FindPaymentSuccessRecords 查找所有支付成功但未发放token的记录
	FindPaymentSuccessRecords(ctx context.Context) ([]*entity.CheckIn, error)

	// Update 更新签到记录
	Update(ctx context.Context, checkIn *entity.CheckIn) error

	// UpdateStatus 更新状态
	UpdateStatus(ctx context.Context, id string, status entity.CheckInStatus) error

	// MarkSuccess 标记为成功
	MarkSuccess(ctx context.Context, id string, txHash string, amount string) error

	// MarkFailed 标记为失败
	MarkFailed(ctx context.Context, id string, reason string) error

	// FindByUserID 查询用户签到记录
	FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*entity.CheckIn, int64, error)

	// GetDailyStats 获取用户每日统计
	GetDailyStats(ctx context.Context, userID string) ([]map[string]interface{}, error)

	// CheckTodayCheckin 检查用户今天是否已签到
	CheckTodayCheckin(ctx context.Context, userID string) (bool, error)

	// CountSuccessCheckinsByUserID 获取用户成功签到的总次数
	CountSuccessCheckinsByUserID(ctx context.Context, userID string) (int64, error)
}
