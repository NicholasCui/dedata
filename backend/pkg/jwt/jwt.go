package jwt

import (
	"fmt"
	"time"

	"github.com/dedata/dedata-backend/config"
	"github.com/golang-jwt/jwt/v5"
)

// Claims JWT 声明
type Claims struct {
	UserID  string `json:"userId"`
	Address string `json:"address"`
	DID     string `json:"did"`
	Role    string `json:"role"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secret     string
	expireHour int
}

// NewJWTManager 创建 JWT 管理器
func NewJWTManager(cfg *config.JWTConfig) *JWTManager {
	return &JWTManager{
		secret:     cfg.Secret,
		expireHour: cfg.ExpireHour,
	}
}

// GenerateToken 生成 JWT token
func (m *JWTManager) GenerateToken(userID, address, did, role string) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID:  userID,
		Address: address,
		DID:     did,
		Role:    role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour * time.Duration(m.expireHour))),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secret))
}

// ValidateToken 验证 JWT token
func (m *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名算法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(m.secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
