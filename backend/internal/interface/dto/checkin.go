package dto

// CheckInRequest Checkin request
type CheckInRequest struct {
	// Can add extra request parameters if needed
}

// CheckInResponse Checkin response (returns 402 when payment required)
type CheckInResponse struct {
	Success       bool           `json:"success"`
	Message       string         `json:"message"`
	L402Challenge *L402Challenge `json:"l402_challenge,omitempty"`
}

// L402Challenge Payment challenge
type L402Challenge struct {
	OrderID        string `json:"order_id"`
	PaymentAddress string `json:"payment_address"`
	PriceAmount    string `json:"price_amount"`
	BlockchainName string `json:"blockchain_name"`
	TokenSymbol    string `json:"token_symbol"`
	ExpiresAt      string `json:"expires_at"`
}

// VerifyCheckInRequest Verify checkin request
type VerifyCheckInRequest struct {
	OrderID string `json:"order_id" binding:"required"`
}

// VerifyCheckInResponse Verify checkin response
type VerifyCheckInResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Status  string `json:"status,omitempty"` // Current checkin status
}

// CheckInHistoryResponse Checkin history response
type CheckInHistoryResponse struct {
	Data       []CheckInRecord `json:"data"`
	Pagination Pagination      `json:"pagination"`
}

// CheckInRecord Checkin record
type CheckInRecord struct {
	ID               string  `json:"id"`
	Status           string  `json:"status"`
	OrderID          *string `json:"orderId,omitempty"`
	PaymentAddress   *string `json:"paymentAddress,omitempty"`
	PriceAmount      *string `json:"priceAmount,omitempty"`
	BlockchainName   *string `json:"blockchainName,omitempty"`
	TokenSymbol      *string `json:"tokenSymbol,omitempty"`
	PaymentExpiresAt *string `json:"paymentExpiresAt,omitempty"`
	TokenAmount      *string `json:"tokenAmount,omitempty"`
	IssueTxHash      *string `json:"issueTxHash,omitempty"`
	FailureReason    *string `json:"failureReason,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	IssuedAt         *string `json:"issuedAt,omitempty"`
}

// CheckInSummaryResponse Checkin summary response
type CheckInSummaryResponse struct {
	TotalRewards  string                   `json:"totalRewards"`
	LastCheckinAt *string                  `json:"lastCheckinAt,omitempty"`
	DailyStats    []map[string]interface{} `json:"dailyStats"`
}
