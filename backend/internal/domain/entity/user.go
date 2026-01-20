package entity

import "time"

type UserRole string
type UserStatus string

const (
	RoleUser  UserRole = "USER"
	RoleAdmin UserRole = "ADMIN"
)

const (
	StatusActive      UserStatus = "ACTIVE"
	StatusSuspended   UserStatus = "SUSPENDED"
	StatusBlacklisted UserStatus = "BLACKLISTED"
)

// User represents a user in the system
type User struct {
	ID               string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	DID              string     `json:"did" gorm:"column:did;uniqueIndex;not null"`
	WalletAddress    string     `json:"walletAddress" gorm:"column:wallet_address;uniqueIndex;not null"`
	ChainID          int        `json:"chainId" gorm:"column:chain_id;not null"`
	Role             UserRole   `json:"role" gorm:"type:varchar(20);default:'USER'"`
	Status           UserStatus `json:"status" gorm:"type:varchar(20);default:'ACTIVE'"`
	ProfileCompleted bool       `json:"profileCompleted" gorm:"column:profile_completed;default:false"`
	TotalRewards     string     `json:"totalRewards" gorm:"column:total_rewards;type:decimal(36,18);default:0"` // 累积奖励
	LastCheckinAt    *time.Time `json:"lastCheckinAt,omitempty" gorm:"column:last_checkin_at;index"`            // 最后签到时间
	CreatedAt        time.Time  `json:"createdAt" gorm:"column:created_at"`
	UpdatedAt        time.Time  `json:"updatedAt" gorm:"column:updated_at"`

	// 关联关系
	Profile *Profile `json:"profile,omitempty" gorm:"foreignKey:UserID"`
}

// Profile represents user profile information
type Profile struct {
	ID          string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID      string     `json:"userId" gorm:"column:user_id;uniqueIndex;not null"`
	DisplayName *string    `json:"displayName,omitempty" gorm:"column:display_name"`
	Email       *string    `json:"email,omitempty"`
	Telegram    *string    `json:"telegram,omitempty"`
	Bio         *string    `json:"bio,omitempty"`
	Avatar      *string    `json:"avatar,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty" gorm:"column:completed_at"`
	UpdatedAt   time.Time  `json:"updatedAt" gorm:"column:updated_at"`
}
