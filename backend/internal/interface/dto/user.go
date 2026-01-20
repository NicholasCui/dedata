package dto

// UpdateProfileRequest 更新 Profile 请求
type UpdateProfileRequest struct {
	DisplayName *string `json:"displayName,omitempty"`
	Email       *string `json:"email,omitempty"`
	Telegram    *string `json:"telegram,omitempty"`
	Bio         *string `json:"bio,omitempty"`
	Avatar      *string `json:"avatar,omitempty"`
}

// ProfileResponse Profile 响应
type ProfileResponse struct {
	ID          string  `json:"id"`
	UserID      string  `json:"userId"`
	DisplayName *string `json:"displayName,omitempty"`
	Email       *string `json:"email,omitempty"`
	Telegram    *string `json:"telegram,omitempty"`
	Bio         *string `json:"bio,omitempty"`
	Avatar      *string `json:"avatar,omitempty"`
	CompletedAt *string `json:"completedAt,omitempty"`
	UpdatedAt   string  `json:"updatedAt"`
}

// LeaderboardUser 排行榜用户信息
type LeaderboardUser struct {
	Rank             int     `json:"rank"`
	ID               string  `json:"id"`
	DID              string  `json:"did"`
	WalletAddress    string  `json:"walletAddress"`
	ChainID          int     `json:"chainId"`
	ProfileCompleted bool    `json:"profileCompleted"`
	TotalRewards     string  `json:"totalRewards"`
	TotalCheckins    int64   `json:"totalCheckins"`
	DisplayName      *string `json:"displayName,omitempty"`
	Avatar           *string `json:"avatar,omitempty"`
}

// Pagination 分页信息
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// LeaderboardResponse 排行榜响应
type LeaderboardResponse struct {
	Data       []LeaderboardUser `json:"data"`
	Pagination Pagination        `json:"pagination"`
}
