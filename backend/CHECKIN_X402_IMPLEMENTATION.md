# CheckIn x402 Payment Integration Implementation

## Overview
This document describes the implementation of the x402 payment-based checkin system for DeData platform.

## Flow Summary

1. **User initiates checkin** ’ Backend calls x402 API ’ Returns HTTP 402 with payment challenge
2. **User pays** ’ Frontend shows payment UI with QR code/address
3. **User clicks "I've paid"** ’ Frontend calls verify endpoint ’ Backend polls x402 until payment confirmed
4. **Payment confirmed** ’ Checkin status updated to `payment_success`
5. **Background worker** ’ Monitors `payment_success` checkins ’ Transfers 10 DeData tokens to user
6. **Transfer complete** ’ Checkin status updated to `success`, user's `total_rewards` updated

## Components Implemented

### 1. Entity Updates
**File:** `internal/domain/entity/checkin.go`

**New Status Values:**
- `pending_payment` - Waiting for user payment
- `payment_failed` - Payment verification failed
- `payment_success` - Payment confirmed, awaiting token transfer
- `issuing` - Token transfer in progress
- `success` - Checkin complete, tokens issued
- `issue_failed` - Token transfer failed

**New Fields in CheckIn:**
```go
// x402 payment info
OrderID          *string
PaymentAddress   *string
PriceAmount      *string
BlockchainName   *string
TokenSymbol      *string
PaymentExpiresAt *time.Time
PaymentTxHash    *string

// Token issuance
TokenAmount      *string
IssueTxHash      *string
FailureReason    *string
RetryCount       int
```

### 2. Configuration
**File:** `config/config.go`

**New Config Sections:**
```go
type X402Config struct {
    BaseURL    string  // x402 ¡0@
    APIToken   string  // API Token
    MerchantID string  // F7ID
}

type CheckInConfig struct {
    PriceAmount     string  // "1.0" - Checkin payment amount (USDT)
    BlockchainType  int     // 2 = Polygon
    TokenSymbol     string  // "USDT"
    RewardAmount    string  // "10" - DeData tokens to reward
    WorkerInterval  int     // Worker polling interval (seconds)
    MaxRetryCount   int     // Max token transfer retry attempts
}
```

**Configuration File Example:**
```yaml
# config/config.development.yaml
x402:
  base_url: "http://x402-server:8086"
  api_token: "your_api_token_here"
  merchant_id: "your_merchant_id_here"

checkin:
  price_amount: "1.0"
  blockchain_type: 2
  token_symbol: "USDT"
  reward_amount: "10"
  worker_interval: 30
  max_retry_count: 3
```

### 3. X402 Client
**File:** `internal/infrastructure/external/x402_client.go`

**Interface:**
```go
type X402Client interface {
    CreatePaymentChallenge(ctx, merchantUserID, priceAmount, blockchainType, tokenSymbol) (*X402Challenge, error)
    VerifyPayment(ctx, orderID, merchantUserID) (success bool, message string, error)
    SettlePayment(ctx, orderID) error
}
```

**Implemented Methods:**
- `CreatePaymentChallenge` - Calls `/v2/api/x402/payment` to create payment order
- `VerifyPayment` - Calls `/v2/api/x402/verify` to check payment status
- `SettlePayment` - Calls `/v2/api/x402/settle` for final settlement (optional)

### 4. Repository Interface Updates
**File:** `internal/domain/repository/repository.go`

**New Methods Added:**
```go
FindByOrderID(ctx, orderID) (*entity.CheckIn, error)
FindPendingPaymentByUserID(ctx, userID) (*entity.CheckIn, error)
FindPaymentSuccessRecords(ctx) ([]*entity.CheckIn, error)
Update(ctx, checkIn) error
CheckTodayCheckin(ctx, userID) (bool, error)
```

### 5. CheckIn UseCase
**File:** `internal/usecase/checkin_usecase.go`

**Updated CheckIn Method:**
```go
func (uc *CheckInUseCase) CheckIn(ctx, userID) (*entity.CheckIn, *external.X402Challenge, error)
```

**Logic:**
1. Verify user exists
2. Check if already checked in today
3. Check for existing pending payment or issuing checkin
4. Call x402 to create payment challenge
5. Save checkin record with `pending_payment` status
6. Return challenge to frontend (will return HTTP 402)

**New VerifyCheckin Method:**
```go
func (uc *CheckInUseCase) VerifyCheckin(ctx, orderID, userID) (success bool, message string, error)
```

**Logic:**
1. Find checkin by order_id
2. Verify user ownership
3. If already paid, return success
4. Call x402 verify API
5. If payment confirmed, update status to `payment_success`

### 6. Background Worker
**File:** `internal/worker/checkin_worker.go`

**Worker Logic:**
```go
func (w *CheckinWorker) Run(ctx) {
    // Runs every WorkerInterval seconds
    // 1. Query all payment_success checkins
    // 2. For each checkin:
    //    a. Check retry count < max
    //    b. Update status to issuing
    //    c. Call TokenIssuer.IssueToken()
    //    d. If success: update to success, update user total_rewards
    //    e. If failed: increment retry_count, revert to payment_success
}
```

**Retry Logic:**
- Failed token transfers automatically retry on next worker run
- Max retry count configurable (default 3)
- After max retries, status set to `issue_failed`

### 7. DTOs
**File:** `internal/interface/dto/checkin.go`

**Key DTOs:**
- `CheckInResponse` - Returns payment challenge (HTTP 402)
- `L402Challenge` - Payment details (address, amount, blockchain, expiry)
- `VerifyCheckInRequest/Response` - Verify payment endpoint
- `CheckInRecord` - Checkin history
- `CheckInSummaryResponse` - User stats with `totalRewards`

## What Still Needs Implementation

### 1. Repository Implementation
**File:** `internal/infrastructure/persistence/checkin_repository.go`

You need to implement these new methods:
```go
func (r *CheckInRepositoryImpl) FindByOrderID(ctx, orderID) (*entity.CheckIn, error)
func (r *CheckInRepositoryImpl) FindPendingPaymentByUserID(ctx, userID) (*entity.CheckIn, error)
func (r *CheckInRepositoryImpl) FindPaymentSuccessRecords(ctx) ([]*entity.CheckIn, error)
func (r *CheckInRepositoryImpl) Update(ctx, checkIn) error
func (r *CheckInRepositoryImpl) CheckTodayCheckin(ctx, userID) (bool, error)
```

**Example Implementation:**
```go
func (r *CheckInRepositoryImpl) FindByOrderID(ctx context.Context, orderID string) (*entity.CheckIn, error) {
    var checkin entity.CheckIn
    err := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&checkin).Error
    return &checkin, err
}

func (r *CheckInRepositoryImpl) FindPendingPaymentByUserID(ctx context.Context, userID string) (*entity.CheckIn, error) {
    var checkin entity.CheckIn
    err := r.db.WithContext(ctx).
        Where("user_id = ? AND status = ?", userID, entity.CheckInPendingPayment).
        First(&checkin).Error
    return &checkin, err
}

func (r *CheckInRepositoryImpl) FindPaymentSuccessRecords(ctx context.Context) ([]*entity.CheckIn, error) {
    var checkins []*entity.CheckIn
    err := r.db.WithContext(ctx).
        Where("status = ?", entity.CheckInPaymentSuccess).
        Find(&checkins).Error
    return checkins, err
}

func (r *CheckInRepositoryImpl) Update(ctx context.Context, checkIn *entity.CheckIn) error {
    return r.db.WithContext(ctx).Save(checkIn).Error
}

func (r *CheckInRepositoryImpl) CheckTodayCheckin(ctx context.Context, userID string) (bool, error) {
    var count int64
    today := time.Now().Format("2006-01-02")
    err := r.db.WithContext(ctx).Model(&entity.CheckIn{}).
        Where("user_id = ? AND status = ? AND DATE(created_at) = ?",
            userID, entity.CheckInSuccess, today).
        Count(&count).Error
    return count > 0, err
}
```

### 2. HTTP Handlers
**File:** `internal/interface/handler/checkin_handler.go`

**POST /checkin - Initiate checkin:**
```go
func (h *CheckInHandler) CheckIn(c *gin.Context) {
    userID := c.GetString("user_id") // from JWT middleware

    checkin, challenge, err := h.usecase.CheckIn(c.Request.Context(), userID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Return HTTP 402 Payment Required
    c.JSON(http.StatusPaymentRequired, dto.CheckInResponse{
        Success: false,
        Message: "Payment required",
        L402Challenge: &dto.L402Challenge{
            OrderID:        challenge.OrderID,
            PaymentAddress: challenge.PaymentAddress,
            PriceAmount:    challenge.PriceAmount,
            BlockchainName: challenge.BlockchainName,
            TokenSymbol:    challenge.TokenSymbol,
            ExpiresAt:      challenge.ExpiresAt,
        },
    })
}
```

**POST /checkin/verify - Verify payment:**
```go
func (h *CheckInHandler) VerifyCheckIn(c *gin.Context) {
    userID := c.GetString("user_id")

    var req dto.VerifyCheckInRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    success, message, err := h.usecase.VerifyCheckin(c.Request.Context(), req.OrderID, userID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, dto.VerifyCheckInResponse{
        Success: success,
        Message: message,
    })
}
```

### 3. Dependency Injection / Main Setup
**File:** `cmd/server/main.go` (or your DI setup)

```go
// Initialize x402 client
x402Client := external.NewX402Client(
    cfg.X402.BaseURL,
    cfg.X402.APIToken,
    cfg.X402.MerchantID,
    logger,
)

// Initialize checkin usecase with x402 client
checkinUseCase := usecase.NewCheckInUseCase(
    checkinRepo,
    userRepo,
    x402Client,
    &cfg.CheckIn,
    logger,
)

// Initialize and start worker
checkinWorker := worker.NewCheckinWorker(
    checkinRepo,
    userRepo,
    tokenIssuer,
    &cfg.CheckIn,
    logger,
)
go checkinWorker.Run(ctx)
```

### 4. Database Migration
You need to run a migration to add new columns to `checkins` table:

```sql
ALTER TABLE checkins ADD COLUMN order_id VARCHAR(128) UNIQUE;
ALTER TABLE checkins ADD COLUMN payment_address VARCHAR(256);
ALTER TABLE checkins ADD COLUMN price_amount VARCHAR(64);
ALTER TABLE checkins ADD COLUMN blockchain_name VARCHAR(64);
ALTER TABLE checkins ADD COLUMN token_symbol VARCHAR(32);
ALTER TABLE checkins ADD COLUMN payment_expires_at TIMESTAMP;
ALTER TABLE checkins ADD COLUMN payment_tx_hash VARCHAR(256);
ALTER TABLE checkins ADD COLUMN issue_tx_hash VARCHAR(128);
ALTER TABLE checkins ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Update status enum if using ENUM type
ALTER TABLE checkins MODIFY COLUMN status VARCHAR(32);

-- Rename old tx_hash column to issue_tx_hash if it exists
ALTER TABLE checkins RENAME COLUMN tx_hash TO issue_tx_hash;
```

Or use GORM AutoMigrate:
```go
db.AutoMigrate(&entity.CheckIn{})
```

## Testing the Flow

### 1. Initiate CheckIn
```bash
curl -X POST http://localhost:8080/checkin \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Expected Response (HTTP 402):**
```json
{
  "success": false,
  "message": "Payment required",
  "l402_challenge": {
    "order_id": "order_12345",
    "payment_address": "0xABC...",
    "price_amount": "1.0",
    "blockchain_name": "Polygon",
    "token_symbol": "USDT",
    "expires_at": "2025-11-25T10:00:00Z"
  }
}
```

### 2. User Pays (via wallet)
User sends 1 USDT to the payment_address on Polygon network.

### 3. Verify Payment
```bash
curl -X POST http://localhost:8080/checkin/verify \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order_12345"}'
```

**Response (if pending):**
```json
{
  "success": false,
  "message": "PENDING_CONFIRMATION"
}
```

**Response (if confirmed):**
```json
{
  "success": true,
  "message": "payment verified"
}
```

### 4. Worker Processes (automatic)
Within 30 seconds (or configured interval), worker will:
1. Detect payment_success checkin
2. Transfer 10 DeData tokens to user's wallet
3. Update checkin status to success
4. Update user's total_rewards

### 5. Check Status
```bash
curl http://localhost:8080/checkin/summary \
  -H "Authorization: Bearer <jwt_token>"
```

**Response:**
```json
{
  "totalRewards": "10",
  "lastCheckinAt": "2025-11-25T09:30:00Z",
  "dailyStats": [...]
}
```

## Key Features

 **x402 Payment Integration** - Full support for HTTP 402 payment challenges
 **Async Token Transfer** - Background worker handles token distribution
 **Retry Logic** - Automatic retry for failed transfers (configurable)
 **Status Tracking** - Comprehensive status flow from payment to token issuance
 **User Balance Updates** - Automatic update of `total_rewards` field
 **Idempotency** - Prevents double-checkins on same day
 **Error Handling** - Graceful failure handling with retry capability

## Architecture Diagram

```
             
  Frontend   
      ,      
        1. POST /checkin
       ¼
                                     
  CheckIn API         > x402 Service 
   (402 Response)<      (Payment)    
      ,                              
        2. Returns payment challenge
       
        3. User pays
       
        4. POST /checkin/verify
       ¼
                                     
  Verify API          > x402 Service 
                 <      (Verify)     
      ,                              
        5. Status: payment_success
       
       ¼
                                     
 Background           > Token Issuer 
 Worker          <      (Transfer)   
      ,                              
        6. Status: success
       
       ¼
                 
 User.total_     
 rewards updated 
                 
```

## Notes

- The field `total_tokens` has been renamed to `total_rewards` across all entities and DTOs
- The x402 service must be running and accessible
- Ensure proper environment variables are set for x402 credentials
- Worker runs continuously in background - consider using a process manager
- Consider implementing webhooks from x402 for instant notifications instead of polling

## Next Steps

1.  Implement repository methods
2.  Create HTTP handlers
3.  Set up dependency injection
4.  Run database migrations
5.  Configure x402 credentials
6.  Test end-to-end flow
7.  Monitor worker logs
8.  Set up monitoring/alerting for failed transfers
