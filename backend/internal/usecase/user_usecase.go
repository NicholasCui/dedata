package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"github.com/dedata/dedata-backend/internal/domain/repository"
	"github.com/dedata/dedata-backend/internal/interface/dto"
	"gorm.io/gorm"
)

type UserUseCase struct {
	userRepo    repository.UserRepository
	profileRepo repository.ProfileRepository
	checkinRepo repository.CheckInRepository
}

func NewUserUseCase(userRepo repository.UserRepository, profileRepo repository.ProfileRepository, checkinRepo repository.CheckInRepository) *UserUseCase {
	return &UserUseCase{
		userRepo:    userRepo,
		profileRepo: profileRepo,
		checkinRepo: checkinRepo,
	}
}

// GetUserInfo 获取用户信息
func (uc *UserUseCase) GetUserInfo(ctx context.Context, userID string) (*entity.User, error) {
	return uc.userRepo.FindByID(ctx, userID)
}

// GetLeaderboard 获取排行榜（分页）
func (uc *UserUseCase) GetLeaderboard(ctx context.Context, page, limit int) (*dto.LeaderboardResponse, error) {
	// 调用 repository 获取用户列表和总数（已包含 Profile，使用 LEFT JOIN）
	users, total, err := uc.userRepo.GetLeaderboard(ctx, page, limit)
	if err != nil {
		return nil, err
	}

	// 构建响应数据
	leaderboardUsers := make([]dto.LeaderboardUser, len(users))
	for i, user := range users {
		// 计算全局排名：(page - 1) * limit + i + 1
		rank := (page-1)*limit + i + 1

		// 获取用户的签到总次数
		checkinCount, err := uc.checkinRepo.CountSuccessCheckinsByUserID(ctx, user.ID)
		if err != nil {
			// 如果查询失败，记录错误但不中断，使用 0 作为默认值
			checkinCount = 0
		}

		leaderboardUser := dto.LeaderboardUser{
			Rank:             rank,
			ID:               user.ID,
			DID:              user.DID,
			WalletAddress:    user.WalletAddress,
			ChainID:          user.ChainID,
			ProfileCompleted: user.ProfileCompleted,
			TotalRewards:     user.TotalRewards,
			TotalCheckins:    checkinCount,
		}

		// 从关联的 Profile 中获取 displayName 和 avatar
		if user.Profile != nil {
			leaderboardUser.DisplayName = user.Profile.DisplayName
			leaderboardUser.Avatar = user.Profile.Avatar
		}

		leaderboardUsers[i] = leaderboardUser
	}

	// 计算总页数
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &dto.LeaderboardResponse{
		Data: leaderboardUsers,
		Pagination: dto.Pagination{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	}, nil
}

// GetProfile 获取用户 Profile
func (uc *UserUseCase) GetProfile(ctx context.Context, userID string) (*entity.Profile, error) {
	return uc.profileRepo.FindByUserID(ctx, userID)
}

// UpdateProfile 更新用户 Profile
func (uc *UserUseCase) UpdateProfile(ctx context.Context, userID string, req *dto.UpdateProfileRequest) (*entity.Profile, error) {
	// 1. 检查用户是否存在
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// 2. 查找或创建 Profile
	profile, err := uc.profileRepo.FindByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 如果不存在，创建新的 Profile
	if profile == nil {
		profile = &entity.Profile{
			UserID: userID,
		}
	}

	// 3. 更新字段（只更新提供的字段）
	if req.DisplayName != nil {
		profile.DisplayName = req.DisplayName
	}
	if req.Email != nil {
		profile.Email = req.Email
	}
	if req.Telegram != nil {
		profile.Telegram = req.Telegram
	}
	if req.Bio != nil {
		profile.Bio = req.Bio
	}
	if req.Avatar != nil {
		profile.Avatar = req.Avatar
	}

	profile.UpdatedAt = time.Now()

	// 4. 检查是否完成 Profile（至少填写 DisplayName 和 Email）
	isCompleted := profile.DisplayName != nil && *profile.DisplayName != "" &&
		profile.Email != nil && *profile.Email != ""

	if isCompleted && profile.CompletedAt == nil {
		now := time.Now()
		profile.CompletedAt = &now

		// 更新用户的 ProfileCompleted 状态
		user.ProfileCompleted = true
		if err := uc.userRepo.Update(ctx, user); err != nil {
			return nil, err
		}
	}

	// 5. Upsert Profile
	if err := uc.profileRepo.Upsert(ctx, profile); err != nil {
		return nil, err
	}

	return profile, nil
}
