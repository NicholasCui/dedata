package entity

import "time"

type AuthorizationStatus string

const (
	AuthActive  AuthorizationStatus = "ACTIVE"
	AuthRevoked AuthorizationStatus = "REVOKED"
	AuthExpired AuthorizationStatus = "EXPIRED"
)

// Authorization represents a platform authorization
type Authorization struct {
	ID        string              `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string              `json:"userId" gorm:"index;not null"`
	Platform  string              `json:"platform" gorm:"type:varchar(50);not null"`
	Scope     string              `json:"scope" gorm:"type:varchar(200)"`
	Status    AuthorizationStatus `json:"status" gorm:"type:varchar(20);default:'ACTIVE'"`
	ExpiresAt *time.Time          `json:"expiresAt,omitempty"`
	CreatedAt time.Time           `json:"createdAt"`
	UpdatedAt time.Time           `json:"updatedAt"`
}
