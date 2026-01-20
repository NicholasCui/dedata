package entity

import "time"

// CheckInStatus 签到状态
type CheckInStatus string

const (
	CheckInPendingPayment CheckInStatus = "pending_payment" // 等待支付
	CheckInPaymentFailed  CheckInStatus = "payment_failed"  // 支付失败
	CheckInPaymentSuccess CheckInStatus = "payment_success" // 支付成功
	CheckInIssuing        CheckInStatus = "issuing"         // 正在发放 token
	CheckInSuccess        CheckInStatus = "success"         // 发放成功
	CheckInIssueFailed    CheckInStatus = "issue_failed"    // 发放失败
)

// CheckIn 签到记录
type CheckIn struct {
	ID     string        `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID string        `json:"userId" gorm:"index;not null"`
	Status CheckInStatus `json:"status" gorm:"type:varchar(32);not null;index"`

	// x402 支付相关
	OrderID          *string    `json:"orderId,omitempty" gorm:"type:varchar(128);uniqueIndex"` // x402 订单ID
	PaymentAddress   *string    `json:"paymentAddress,omitempty" gorm:"type:varchar(256)"`      // 支付地址
	PriceAmount      *string    `json:"priceAmount,omitempty" gorm:"type:varchar(64)"`          // 价格金额
	BlockchainName   *string    `json:"blockchainName,omitempty" gorm:"type:varchar(64)"`       // 区块链名称
	TokenSymbol      *string    `json:"tokenSymbol,omitempty" gorm:"type:varchar(32)"`          // 代币符号
	PaymentExpiresAt *time.Time `json:"paymentExpiresAt,omitempty"`                             // 支付过期时间
	PaymentTxHash    *string    `json:"paymentTxHash,omitempty" gorm:"type:varchar(256)"`       // 用户支付的交易哈希

	// Token 发放相关
	TokenAmount   *string `json:"tokenAmount,omitempty" gorm:"type:decimal(36,18)"` // 发放的 token 数量
	IssueTxHash   *string `json:"issueTxHash,omitempty" gorm:"type:varchar(128)"`   // 发放交易哈希
	FailureReason *string `json:"failureReason,omitempty" gorm:"type:text"`         // 失败原因
	RetryCount    int     `json:"retryCount" gorm:"default:0"`                      // 重试次数

	CreatedAt time.Time  `json:"createdAt" gorm:"index"`
	UpdatedAt time.Time  `json:"updatedAt"`
	IssuedAt  *time.Time `json:"issuedAt,omitempty"` // token 发放完成时间
}

// IsSuccess 是否成功
func (c *CheckIn) IsSuccess() bool {
	return c.Status == CheckInSuccess
}

// IsIssuing 是否正在发放
func (c *CheckIn) IsIssuing() bool {
	return c.Status == CheckInIssuing
}

// IsPendingPayment 是否等待支付
func (c *CheckIn) IsPendingPayment() bool {
	return c.Status == CheckInPendingPayment
}

// IsPaymentSuccess 支付是否成功
func (c *CheckIn) IsPaymentSuccess() bool {
	return c.Status == CheckInPaymentSuccess
}

// CanRetry 是否可以重试
func (c *CheckIn) CanRetry() bool {
	return c.Status == CheckInPaymentFailed || c.Status == CheckInIssueFailed
}

// TokenPayout 保留原有的 Payout 结构(可能用于其他场景)
type PayoutStatus string

const (
	PayoutQueued          PayoutStatus = "QUEUED"
	PayoutProcessing      PayoutStatus = "PROCESSING"
	PayoutSuccess         PayoutStatus = "SUCCESS"
	PayoutFailed          PayoutStatus = "FAILED"
	PayoutFailedPermanent PayoutStatus = "FAILED_PERMANENT"
)

type TokenPayout struct {
	ID          string       `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID      string       `json:"userId" gorm:"index;not null"`
	DID         string       `json:"did" gorm:"index;not null"`
	Amount      string       `json:"amount" gorm:"type:varchar(100);not null"`
	Status      PayoutStatus `json:"status" gorm:"type:varchar(30);default:'QUEUED'"`
	TxHash      *string      `json:"txHash,omitempty"`
	ErrorReason *string      `json:"errorReason,omitempty"`
	RetryCount  int          `json:"retryCount" gorm:"default:0"`
	CheckInID   *string      `json:"checkInId,omitempty" gorm:"index"`
	CreatedAt   time.Time    `json:"createdAt"`
	ProcessedAt *time.Time   `json:"processedAt,omitempty"`
}
