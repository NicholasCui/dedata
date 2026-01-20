package external

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// X402 API Documentation:
// - Base URL: http://<host>:8086
// - All /api/* and /v2/* paths require headers:
//   - X-API-Token: <your_token>
//   - X-Merchant-ID: <your_merchant_id>
// - Rate Limits:
//   - Per merchant: 50 req/sec (global)
//   - Verify endpoint:
//     - Same order_id: max 1 request per 30 seconds
//     - Same merchant_user: max 3 requests per 30 seconds

// X402Challenge Payment challenge structure
type X402Challenge struct {
	OrderID        string `json:"order_id"`
	PaymentAddress string `json:"payment_address"`
	PriceAmount    string `json:"price_amount"`
	BlockchainName string `json:"blockchain_name"`
	TokenSymbol    string `json:"token_symbol"`
	ExpiresAt      string `json:"expires_at"`
}

// X402Response Generic x402 API response
type X402Response struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// X402PaymentData Payment response data
type X402PaymentData struct {
	L402Challenge X402Challenge `json:"l402_challenge"`
}

// X402VerifyData Verification response data
type X402VerifyData struct {
	Order            map[string]interface{} `json:"order"`
	ValidationResult map[string]interface{} `json:"validation_result"`
}

// X402Client x402 client interface
type X402Client interface {
	// GetNetworks gets supported blockchain networks and tokens
	// GET /networks
	// Public endpoint, no authentication required
	GetNetworks(ctx context.Context) ([]byte, error)

	// DailyCheckin performs daily check-in via x402
	// POST /api/business/daily-checkin
	// Returns 200 if already checked in, 402 with payment challenge otherwise
	DailyCheckin(ctx context.Context, merchantUserID string) (statusCode int, responseBody []byte, err error)

	// CreatePaymentChallenge creates a payment challenge
	// POST /v2/api/x402/payment
	// Returns HTTP 402 with payment challenge
	CreatePaymentChallenge(ctx context.Context, merchantUserID, priceAmount string, blockchainType int, tokenSymbol string) (*X402Challenge, error)

	// VerifyPayment verifies if payment has been made
	// POST /v2/api/x402/verify
	// IMPORTANT: Rate limited - same order_id: max 1/30s, same user: max 3/30s
	// Returns: success=true (complete), success=false + PENDING_CONFIRMATION (wait 30s), or error
	VerifyPayment(ctx context.Context, orderID, merchantUserID string) (success bool, message string, err error)

	// SettlePayment settles the payment (optional, idempotent)
	// POST /v2/api/x402/settle
	SettlePayment(ctx context.Context, orderID string) error
}

// X402ClientImpl x402 client implementation
type X402ClientImpl struct {
	baseURL    string
	apiToken   string
	merchantID string
	httpClient *http.Client
	logger     *zap.Logger
}

// NewX402Client creates a new x402 client
func NewX402Client(baseURL, apiToken, merchantID string, logger *zap.Logger) *X402ClientImpl {
	return &X402ClientImpl{
		baseURL:    baseURL,
		apiToken:   apiToken,
		merchantID: merchantID,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// CreatePaymentChallenge creates a payment challenge
// POST /v2/api/x402/payment
// Expected response: HTTP 402 with l402_challenge data
func (c *X402ClientImpl) CreatePaymentChallenge(ctx context.Context, merchantUserID, priceAmount string, blockchainType int, tokenSymbol string) (*X402Challenge, error) {
	url := fmt.Sprintf("%s/v2/api/x402/payment", c.baseURL)

	payload := map[string]interface{}{
		"merchant_id":      c.merchantID,
		"merchant_user_id": merchantUserID,
		"price_amount":     priceAmount,
		"blockchain_type":  blockchainType,
		"token_symbol":     tokenSymbol,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set required headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Token", c.apiToken)
	req.Header.Set("X-Merchant-ID", c.merchantID)

	c.logger.Debug("Creating payment challenge",
		zap.String("url", url),
		zap.String("merchant_user_id", merchantUserID),
		zap.String("price_amount", priceAmount),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// x402 payment endpoint returns 402 Payment Required
	if resp.StatusCode != http.StatusPaymentRequired {
		c.logger.Error("Unexpected status code from x402",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(respBody)),
		)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(respBody))
	}

	var x402Resp X402Response
	if err := json.Unmarshal(respBody, &x402Resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	var paymentData X402PaymentData
	if err := json.Unmarshal(x402Resp.Data, &paymentData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payment data: %w", err)
	}

	c.logger.Info("Payment challenge created successfully",
		zap.String("order_id", paymentData.L402Challenge.OrderID),
		zap.String("merchant_user_id", merchantUserID),
		zap.String("payment_address", paymentData.L402Challenge.PaymentAddress),
		zap.String("price_amount", paymentData.L402Challenge.PriceAmount),
		zap.String("blockchain_name", paymentData.L402Challenge.BlockchainName),
		zap.String("token_symbol", paymentData.L402Challenge.TokenSymbol),
		zap.String("expires_at", paymentData.L402Challenge.ExpiresAt),
	)

	return &paymentData.L402Challenge, nil
}

// VerifyPayment verifies if payment has been completed
// POST /v2/api/x402/verify
// IMPORTANT: Rate limited!
// - Same order_id: max 1 request per 30 seconds
// - Same merchant_user_id: max 3 requests per 30 seconds
//
// Response messages:
// - success=true: Payment verified and complete
// - success=false + "PENDING_CONFIRMATION": Payment submitted, waiting for blockchain confirmation (retry after 30s)
// - success=false + "NO_TRANSACTION": No transaction found for this order
// - success=false + "INSUFFICIENT_AMOUNT": Payment amount is insufficient
func (c *X402ClientImpl) VerifyPayment(ctx context.Context, orderID, merchantUserID string) (success bool, message string, err error) {
	url := fmt.Sprintf("%s/v2/api/x402/verify", c.baseURL)

	payload := map[string]interface{}{
		"order_id":         orderID,
		"merchant_id":      c.merchantID,
		"merchant_user_id": merchantUserID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return false, "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set required headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Token", c.apiToken)
	req.Header.Set("X-Merchant-ID", c.merchantID)

	c.logger.Debug("Verifying payment",
		zap.String("url", url),
		zap.String("order_id", orderID),
		zap.String("merchant_user_id", merchantUserID),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", fmt.Errorf("failed to read response: %w", err)
	}

	// Check for rate limiting
	if resp.StatusCode == http.StatusTooManyRequests {
		c.logger.Warn("Rate limit exceeded",
			zap.String("order_id", orderID),
			zap.String("response", string(respBody)),
		)
		return false, "RATE_LIMIT_EXCEEDED", fmt.Errorf("rate limit exceeded: please wait 30 seconds before retrying")
	}

	var x402Resp X402Response
	if err := json.Unmarshal(respBody, &x402Resp); err != nil {
		return false, "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	c.logger.Info("Payment verification result",
		zap.String("order_id", orderID),
		zap.Bool("success", x402Resp.Success),
		zap.String("message", x402Resp.Message),
		zap.Int("status_code", resp.StatusCode),
	)

	return x402Resp.Success, x402Resp.Message, nil
}

// SettlePayment settles the payment (idempotent operation)
// POST /v2/api/x402/settle
// Optional call after payment is verified
// Returns success if already settled
func (c *X402ClientImpl) SettlePayment(ctx context.Context, orderID string) error {
	url := fmt.Sprintf("%s/v2/api/x402/settle", c.baseURL)

	payload := map[string]interface{}{
		"order_id": orderID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set required headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Token", c.apiToken)
	req.Header.Set("X-Merchant-ID", c.merchantID)

	c.logger.Debug("Settling payment",
		zap.String("url", url),
		zap.String("order_id", orderID),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var x402Resp X402Response
	if err := json.Unmarshal(respBody, &x402Resp); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if !x402Resp.Success {
		c.logger.Error("Payment settlement failed",
			zap.String("order_id", orderID),
			zap.String("message", x402Resp.Message),
		)
		return fmt.Errorf("settle failed: %s", x402Resp.Message)
	}

	c.logger.Info("Payment settled successfully",
		zap.String("order_id", orderID),
		zap.String("message", x402Resp.Message),
	)

	return nil
}

// GetNetworks gets supported blockchain networks and tokens from x402
// GET /networks
// Public endpoint, no authentication required
func (c *X402ClientImpl) GetNetworks(ctx context.Context) ([]byte, error) {
	url := fmt.Sprintf("%s/networks", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.logger.Debug("Getting networks from x402",
		zap.String("url", url),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		c.logger.Error("Failed to get networks from x402",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(respBody)),
		)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(respBody))
	}

	c.logger.Info("Successfully retrieved networks from x402",
		zap.Int("status_code", resp.StatusCode),
		zap.Int("response_size", len(respBody)),
	)

	return respBody, nil
}

// DailyCheckin performs daily check-in via x402
// POST /api/business/daily-checkin
// Returns 200 if already checked in, 402 with payment challenge otherwise
// Fixed: 1 USD Polygon USDT payment
// Request body:
//   - merchant_id: merchant identifier
//   - merchant_user_id: end user identifier
//   - checkin_date: check-in date in YYYY-MM-DD format
func (c *X402ClientImpl) DailyCheckin(ctx context.Context, merchantUserID string) (statusCode int, responseBody []byte, err error) {
	url := fmt.Sprintf("%s/api/business/daily-checkin", c.baseURL)

	// Get current date in YYYY-MM-DD format
	checkinDate := time.Now().Format("2006-01-02")

	payload := map[string]interface{}{
		"merchant_id":      c.merchantID,
		"merchant_user_id": merchantUserID,
		"checkin_date":     checkinDate,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return 0, nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set required headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Token", c.apiToken)
	req.Header.Set("X-Merchant-ID", c.merchantID)

	c.logger.Debug("Calling x402 daily-checkin",
		zap.String("url", url),
		zap.String("merchant_user_id", merchantUserID),
		zap.String("checkin_date", checkinDate),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, fmt.Errorf("failed to read response: %w", err)
	}

	c.logger.Info("x402 daily-checkin response",
		zap.Int("status_code", resp.StatusCode),
		zap.String("merchant_user_id", merchantUserID),
		zap.String("checkin_date", checkinDate),
		zap.Int("response_size", len(respBody)),
	)

	return resp.StatusCode, respBody, nil
}
