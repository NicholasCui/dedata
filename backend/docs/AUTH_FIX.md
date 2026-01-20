# 数据库字段映射问题修复

## 问题描述

后端启动时报错：
```
failed to create challenge: ERROR: column "address" of relation "login_challenges" does not exist (SQLSTATE 42703)
```

## 根本原因

Go 后端的 `LoginChallenge` entity 字段名和数据库表列名不匹配：

- **Entity 字段**: `Address` (GORM 默认映射为 `address`)
- **数据库列**: `wallet_address`

## 修复内容

### 1. 更新 Entity (internal/domain/entity/auth.go)

```go
// 之前
type LoginChallenge struct {
    ID        string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Address   string    `json:"address" gorm:"index;not null"`
    Nonce     string    `json:"nonce" gorm:"uniqueIndex;not null"`
    ChainID   int       `json:"chainId" gorm:"not null"`
    Message   string    `json:"message" gorm:"type:text;not null"`
    ExpiresAt time.Time `json:"expiresAt" gorm:"index;not null"`
    UsedAt    *time.Time `json:"usedAt,omitempty" gorm:"index"`
    CreatedAt time.Time `json:"createdAt"`
}

// 之后 (简化版)
type LoginChallenge struct {
    ID        string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Address   string     `json:"address" gorm:"column:wallet_address;index;not null"`
    Nonce     string     `json:"nonce" gorm:"uniqueIndex;not null"`
    Used      bool       `json:"used" gorm:"default:false"`
    ExpiresAt time.Time  `json:"expiresAt" gorm:"column:expires_at;index;not null"`
    CreatedAt time.Time  `json:"createdAt" gorm:"column:created_at"`
}
```

**关键变化**：
- 添加 `gorm:"column:wallet_address"` 显式指定数据库列名
- 移除 `ChainID` 和 `Message` 字段（简化认证流程）
- 将 `UsedAt *time.Time` 改为 `Used bool`（简化）
- 添加显式列名映射：`expires_at`, `created_at`

### 2. 更新 Repository (internal/infrastructure/database/auth_repository.go)

```go
// 之前
func (r *GormAuthRepository) MarkChallengeAsUsed(ctx context.Context, nonce string) error {
    now := time.Now()
    return r.db.WithContext(ctx).
        Model(&entity.LoginChallenge{}).
        Where("nonce = ?", nonce).
        Update("used_at", now).Error
}

// 之后
func (r *GormAuthRepository) MarkChallengeAsUsed(ctx context.Context, nonce string) error {
    return r.db.WithContext(ctx).
        Model(&entity.LoginChallenge{}).
        Where("nonce = ?", nonce).
        Update("used", true).Error
}
```

### 3. 简化 UseCase (internal/usecase/auth_usecase.go)

**GenerateNonce** - 只返回 nonce，不生成完整消息：
```go
// 之前 - 返回完整的消息
return &dto.NonceResponse{
    Nonce:     nonce,
    Message:   message,
    ExpiresAt: expiresAt.Format(time.RFC3339),
}, nil

// 之后 - 只返回 nonce，前端自己构造消息
return &dto.NonceResponse{
    Nonce: nonce,
}, nil
```

**VerifySignature** - 简化验证逻辑：
- 移除 ChainID 校验
- 移除 Message 完全匹配校验
- 只验证：nonce 有效性、地址匹配、签名正确

### 4. 更新 DTO (internal/interface/dto/auth.go)

```go
// 之前
type NonceRequest struct {
    Address string `json:"address" binding:"required"`
    ChainID int    `json:"chainId" binding:"required"`
}

type NonceResponse struct {
    Nonce     string `json:"nonce"`
    Message   string `json:"message"`
    ExpiresAt string `json:"expiresAt"`
}

// 之后
type NonceRequest struct {
    Address string `json:"walletAddress" binding:"required"`
}

type NonceResponse struct {
    Nonce string `json:"nonce"`
}
```

### 5. 更新前端 API (src/infrastructure/api/endpoints/backend-auth.ts)

```typescript
// 之前
export interface GetNonceRequest {
  address: string
  chainId: number
}

// 之后
export interface GetNonceRequest {
  walletAddress: string
}
```

## 为什么简化

1. **ChainID 不需要存储**：
   - 签名验证不需要 ChainID
   - 可以从用户表中获取

2. **Message 不需要完整匹配**：
   - 只要包含 nonce 即可
   - 签名验证已经足够安全

3. **UsedAt → Used**：
   - 只需要知道是否使用过
   - 不需要精确的使用时间

## 数据库表结构（不变）

```sql
CREATE TABLE login_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nonce VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 认证流程

### 1. 前端请求 nonce
```typescript
POST /api/auth/nonce
Body: { walletAddress: "0x..." }
Response: { nonce: "uuid" }
```

### 2. 前端构造消息并签名
```typescript
const message = `Sign this message to authenticate with DeData Protocol\n\nNonce: ${nonce}`
const signature = await signMessageAsync({ message })
```

### 3. 前端提交验证
```typescript
POST /api/auth/verify
Body: {
  walletAddress: "0x...",
  nonce: "uuid",
  signature: "0x..."
}
Response: { token: "jwt", user: {...} }
```

## 测试验证

运行以下命令验证修复：

```bash
cd dedata-backend
go build -o bin/api cmd/api/main.go  # 编译成功
./bin/api                             # 启动服务
```

前端测试：
```bash
cd dedata-interface
npm run dev
# 访问 http://localhost:3000
# 点击登录，测试完整流程
```

## 相关文件

- `dedata-backend/internal/domain/entity/auth.go`
- `dedata-backend/internal/infrastructure/database/auth_repository.go`
- `dedata-backend/internal/usecase/auth_usecase.go`
- `dedata-backend/internal/interface/dto/auth.go`
- `dedata-interface/src/infrastructure/api/endpoints/backend-auth.ts`
