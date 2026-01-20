package entity

import "time"

// LoginChallenge 登录挑战(nonce)
type LoginChallenge struct {
	ID        string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Address   string     `json:"address" gorm:"column:wallet_address;index;not null"`
	Nonce     string     `json:"nonce" gorm:"uniqueIndex;not null"`
	Used      bool       `json:"used" gorm:"default:false"`
	ExpiresAt time.Time  `json:"expiresAt" gorm:"column:expires_at;index;not null"`
	CreatedAt time.Time  `json:"createdAt" gorm:"column:created_at"`
}

// IsExpired 检查是否过期
func (c *LoginChallenge) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}

// IsUsed 检查是否已使用
func (c *LoginChallenge) IsUsed() bool {
	return c.Used
}

// TableName 指定表名
func (LoginChallenge) TableName() string {
	return "login_challenges"
}
