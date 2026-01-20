package database

import (
	"context"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"gorm.io/gorm"
)

type GormAuthRepository struct {
	db *gorm.DB
}

func NewGormAuthRepository(db *gorm.DB) *GormAuthRepository {
	return &GormAuthRepository{db: db}
}

// CreateChallenge 创建登录挑战
func (r *GormAuthRepository) CreateChallenge(ctx context.Context, challenge *entity.LoginChallenge) error {
	return r.db.WithContext(ctx).Create(challenge).Error
}

// FindChallengeByNonce 通过 nonce 查找挑战
func (r *GormAuthRepository) FindChallengeByNonce(ctx context.Context, nonce string) (*entity.LoginChallenge, error) {
	var challenge entity.LoginChallenge
	err := r.db.WithContext(ctx).Where("nonce = ?", nonce).First(&challenge).Error
	if err != nil {
		return nil, err
	}
	return &challenge, nil
}

// MarkChallengeAsUsed 标记挑战为已使用
func (r *GormAuthRepository) MarkChallengeAsUsed(ctx context.Context, nonce string) error {
	return r.db.WithContext(ctx).
		Model(&entity.LoginChallenge{}).
		Where("nonce = ?", nonce).
		Update("used", true).Error
}

// DeleteExpiredChallenges 删除过期的挑战
func (r *GormAuthRepository) DeleteExpiredChallenges(ctx context.Context) error {
	return r.db.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&entity.LoginChallenge{}).Error
}
