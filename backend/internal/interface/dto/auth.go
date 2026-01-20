package dto

// NonceRequest 请求 nonce (简化版)
type NonceRequest struct {
	Address string `json:"walletAddress" binding:"required"`
}

// NonceResponse nonce 响应 (简化版，前端自己构造消息)
type NonceResponse struct {
	Nonce string `json:"nonce"`
}

// VerifyRequest 验证签名请求
type VerifyRequest struct {
	Address   string `json:"walletAddress" binding:"required"`
	Nonce     string `json:"nonce" binding:"required"`
	Signature string `json:"signature" binding:"required"`
	Message   string `json:"message,omitempty"` // 可选，用于验证
}

// AuthResponse 认证响应
type AuthResponse struct {
	Token string    `json:"token"`
	User  *UserInfo `json:"user"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID               string `json:"id"`
	Address          string `json:"walletAddress"`
	DID              string `json:"did"`
	Role             string `json:"role"`
	ProfileCompleted bool   `json:"profileCompleted"`
}
