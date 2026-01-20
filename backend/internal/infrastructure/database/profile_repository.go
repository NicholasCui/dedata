package database

import (
	"context"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormProfileRepository struct {
	db *gorm.DB
}

func NewGormProfileRepository(db *gorm.DB) *GormProfileRepository {
	return &GormProfileRepository{db: db}
}

// FindByUserID 通过用户 ID 查找 Profile
func (r *GormProfileRepository) FindByUserID(ctx context.Context, userID string) (*entity.Profile, error) {
	var profile entity.Profile
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindByUserIDs 批量查询用户的 Profiles
func (r *GormProfileRepository) FindByUserIDs(ctx context.Context, userIDs []string) (map[string]*entity.Profile, error) {
	if len(userIDs) == 0 {
		return make(map[string]*entity.Profile), nil
	}

	var profiles []*entity.Profile
	err := r.db.WithContext(ctx).Where("user_id IN ?", userIDs).Find(&profiles).Error
	if err != nil {
		return nil, err
	}

	// 转换为 map，key 为 user_id
	profileMap := make(map[string]*entity.Profile, len(profiles))
	for _, profile := range profiles {
		profileMap[profile.UserID] = profile
	}

	return profileMap, nil
}

// Create 创建 Profile
func (r *GormProfileRepository) Create(ctx context.Context, profile *entity.Profile) error {
	return r.db.WithContext(ctx).Create(profile).Error
}

// Update 更新 Profile
func (r *GormProfileRepository) Update(ctx context.Context, profile *entity.Profile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

// Upsert 更新或创建 Profile (使用 ON CONFLICT)
func (r *GormProfileRepository) Upsert(ctx context.Context, profile *entity.Profile) error {
	now := time.Now()
	profile.UpdatedAt = now

	// 如果所有字段都填写了，设置 CompletedAt
	if profile.DisplayName != nil && *profile.DisplayName != "" &&
		profile.Email != nil && *profile.Email != "" {
		profile.CompletedAt = &now
	}

	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}},
			UpdateAll: true,
		}).
		Create(profile).Error
}
