package database

import (
	"context"
	"time"

	"github.com/dedata/dedata-backend/internal/domain/entity"
	"gorm.io/gorm"
)

type GormCheckInRepository struct {
	db *gorm.DB
}

func NewGormCheckInRepository(db *gorm.DB) *GormCheckInRepository {
	return &GormCheckInRepository{db: db}
}

// Create 创建签到记录
func (r *GormCheckInRepository) Create(ctx context.Context, checkIn *entity.CheckIn) error {
	return r.db.WithContext(ctx).Create(checkIn).Error
}

// FindByID 通过 ID 查找
func (r *GormCheckInRepository) FindByID(ctx context.Context, id string) (*entity.CheckIn, error) {
	var checkIn entity.CheckIn
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&checkIn).Error
	if err != nil {
		return nil, err
	}
	return &checkIn, nil
}

// FindByOrderID 通过 order_id 查找
func (r *GormCheckInRepository) FindByOrderID(ctx context.Context, orderID string) (*entity.CheckIn, error) {
	var checkIn entity.CheckIn
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&checkIn).Error
	if err != nil {
		return nil, err
	}
	return &checkIn, nil
}

// FindPendingPaymentByUserID 查找用户等待支付的签到
func (r *GormCheckInRepository) FindPendingPaymentByUserID(ctx context.Context, userID string) (*entity.CheckIn, error) {
	var checkIn entity.CheckIn
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = ?", userID, entity.CheckInPendingPayment).
		Order("created_at DESC").
		First(&checkIn).Error
	if err != nil {
		return nil, err
	}
	return &checkIn, nil
}

// FindIssuingByUserID 查找用户正在发放中的签到
func (r *GormCheckInRepository) FindIssuingByUserID(ctx context.Context, userID string) (*entity.CheckIn, error) {
	var checkIn entity.CheckIn
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = ?", userID, entity.CheckInIssuing).
		First(&checkIn).Error
	if err != nil {
		return nil, err
	}
	return &checkIn, nil
}

// FindIssuingRecords 查找所有正在发放中的记录
func (r *GormCheckInRepository) FindIssuingRecords(ctx context.Context) ([]*entity.CheckIn, error) {
	var checkIns []*entity.CheckIn
	err := r.db.WithContext(ctx).
		Where("status = ?", entity.CheckInIssuing).
		Order("created_at ASC").
		Find(&checkIns).Error
	return checkIns, err
}

// FindPaymentSuccessRecords 查找所有支付成功但未发放token的记录
func (r *GormCheckInRepository) FindPaymentSuccessRecords(ctx context.Context) ([]*entity.CheckIn, error) {
	var checkIns []*entity.CheckIn
	err := r.db.WithContext(ctx).
		Where("status = ?", entity.CheckInPaymentSuccess).
		Order("created_at ASC").
		Find(&checkIns).Error
	return checkIns, err
}

// Update 更新签到记录
func (r *GormCheckInRepository) Update(ctx context.Context, checkIn *entity.CheckIn) error {
	return r.db.WithContext(ctx).Save(checkIn).Error
}

// UpdateStatus 更新状态
func (r *GormCheckInRepository) UpdateStatus(ctx context.Context, id string, status entity.CheckInStatus) error {
	return r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Where("id = ?", id).
		Update("status", status).Error
}

// MarkSuccess 标记为成功
func (r *GormCheckInRepository) MarkSuccess(ctx context.Context, id string, txHash string, amount string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":        entity.CheckInSuccess,
			"issue_tx_hash": txHash,
			"token_amount":  amount,
			"issued_at":     now,
		}).Error
}

// MarkFailed 标记为失败
func (r *GormCheckInRepository) MarkFailed(ctx context.Context, id string, reason string) error {
	return r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":         entity.CheckInIssueFailed,
			"failure_reason": reason,
		}).Error
}

// FindByUserID 查询用户签到记录
func (r *GormCheckInRepository) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*entity.CheckIn, int64, error) {
	var checkIns []*entity.CheckIn
	var total int64

	// 查询总数
	if err := r.db.WithContext(ctx).Model(&entity.CheckIn{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 查询数据
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&checkIns).Error

	return checkIns, total, err
}

// GetDailyStats 获取用户每日统计
func (r *GormCheckInRepository) GetDailyStats(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Select("DATE(issued_at) as date, SUM(CAST(token_amount AS DECIMAL)) as token_amount").
		Where("user_id = ? AND status = ?", userID, entity.CheckInSuccess).
		Group("DATE(issued_at)").
		Order("date ASC").
		Find(&results).Error

	return results, err
}

// CheckTodayCheckin 检查用户今天是否已签到
func (r *GormCheckInRepository) CheckTodayCheckin(ctx context.Context, userID string) (bool, error) {
	var count int64
	today := time.Now().Format("2006-01-02")

	err := r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Where("user_id = ? AND status = ? AND DATE(created_at) = ?",
			userID, entity.CheckInSuccess, today).
		Count(&count).Error

	return count > 0, err
}

// CountSuccessCheckinsByUserID 获取用户成功签到的总次数
func (r *GormCheckInRepository) CountSuccessCheckinsByUserID(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&entity.CheckIn{}).
		Where("user_id = ? AND status = ?", userID, entity.CheckInSuccess).
		Count(&count).Error
	return count, err
}
