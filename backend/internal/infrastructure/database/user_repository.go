package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"gorm.io/gorm"
)

type GormUserRepository struct {
	db *gorm.DB
}

func NewGormUserRepository(db *gorm.DB) *GormUserRepository {
	return &GormUserRepository{db: db}
}

// FindByAddress 通过地址查找用户
func (r *GormUserRepository) FindByAddress(ctx context.Context, address string) (*entity.User, error) {
	var user entity.User
	// 地址不区分大小写
	address = strings.ToLower(address)
	err := r.db.WithContext(ctx).Where("LOWER(wallet_address) = ?", address).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByDID 通过 DID 查找用户
func (r *GormUserRepository) FindByDID(ctx context.Context, did string) (*entity.User, error) {
	var user entity.User
	err := r.db.WithContext(ctx).Where("did = ?", did).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID 通过 ID 查找用户
func (r *GormUserRepository) FindByID(ctx context.Context, id string) (*entity.User, error) {
	var user entity.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create 创建用户
func (r *GormUserRepository) Create(ctx context.Context, user *entity.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// Update 更新用户
func (r *GormUserRepository) Update(ctx context.Context, user *entity.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// UpdateTokensAndCheckin 更新用户 token 和最后签到时间
func (r *GormUserRepository) UpdateTokensAndCheckin(ctx context.Context, userID string, addTokens string, checkinTime time.Time) error {
	return r.db.WithContext(ctx).
		Model(&entity.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"total_rewards":   gorm.Expr("total_rewards + ?", addTokens),
			"last_checkin_at": checkinTime,
		}).Error
}

// GetLeaderboard 获取排行榜（分页）
func (r *GormUserRepository) GetLeaderboard(ctx context.Context, page, limit int) ([]*entity.User, int64, error) {
	var users []*entity.User
	var total int64

	// 计算 offset
	offset := (page - 1) * limit

	// 获取总数
	if err := r.db.WithContext(ctx).Model(&entity.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据，使用 Preload 关联查询 Profile（LEFT JOIN）
	err := r.db.WithContext(ctx).
		Preload("Profile").
		Order("CAST(total_rewards AS DECIMAL) DESC").
		Limit(limit).
		Offset(offset).
		Find(&users).Error

	return users, total, err
}

// GetUserRankByRewards 获取用户根据 total_rewards 的排名
func (r *GormUserRepository) GetUserRankByRewards(ctx context.Context, userID string) (int, error) {
	var rank int64

	// 使用子查询计算排名
	// 排名 = 比该用户 total_rewards 更高的用户数 + 1
	err := r.db.WithContext(ctx).
		Model(&entity.User{}).
		Where("CAST(total_rewards AS DECIMAL) > (SELECT CAST(total_rewards AS DECIMAL) FROM users WHERE id = ?)", userID).
		Count(&rank).Error

	if err != nil {
		return 0, err
	}

	// 排名从1开始，所以需要 +1
	return int(rank) + 1, nil
}

// FindByIDWithProfile 通过 ID 查找用户(包含 Profile)
func (r *GormUserRepository) FindByIDWithProfile(ctx context.Context, id string) (*entity.User, error) {
	var user entity.User
	err := r.db.WithContext(ctx).
		Preload("Profile").
		Where("id = ?", id).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GenerateDID 生成 DID (简化版: did:dedata:address)
func GenerateDID(address string) string {
	return fmt.Sprintf("did:dedata:%s", strings.ToLower(address))
}
