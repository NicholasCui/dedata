# API 接口文档

## 概述

dedata-backend 提供了一套完整的 RESTful API,包括认证、签到、用户信息和排行榜功能。

## 基础信息

- **Base URL**: `http://localhost:8080/api`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token

## 通用响应格式

所有 API 响应都遵循统一的格式:

### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

## API 端点

### 1. 健康检查

#### GET /api/health
检查服务健康状态

**请求**:
```bash
curl http://localhost:8080/api/health
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok",
    "database": "connected",
    "redis": "connected"
  }
}
```

---

### 2. 认证相关

#### POST /api/auth/nonce
获取登录随机数(nonce)

**请求**:
```bash
curl -X POST http://localhost:8080/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234..."}'
```

**请求体**:
```json
{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "nonce": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### POST /api/auth/verify
验证签名并登录

**请求**:
```bash
curl -X POST http://localhost:8080/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234...",
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "signature": "0xabcd..."
  }'
```

**请求体**:
```json
{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "nonce": "550e8400-e29b-41d4-a716-446655440000",
  "signature": "0xabcd..."
}
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "walletAddress": "0x1234...",
      "did": "did:dedata:0x1234...",
      "totalTokens": "100.5",
      "lastCheckinAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### POST /api/auth/logout
登出(客户端应删除 token)

**请求头**:
```
Authorization: Bearer <token>
```

**请求**:
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "code": 0,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 3. 用户相关

#### GET /api/user/me
获取我的用户信息

**请求头**:
```
Authorization: Bearer <token>
```

**请求**:
```bash
curl http://localhost:8080/api/user/me \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "walletAddress": "0x1234...",
    "did": "did:dedata:0x1234...",
    "totalTokens": "1000.123456789012345678",
    "lastCheckinAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/user/leaderboard
获取排行榜(公开接口)

**查询参数**:
- `limit`: 返回数量,默认 100,最大 1000

**请求**:
```bash
curl "http://localhost:8080/api/user/leaderboard?limit=10"
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid1",
        "walletAddress": "0x1111...",
        "did": "did:dedata:0x1111...",
        "totalTokens": "10000.5",
        "lastCheckinAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "uuid2",
        "walletAddress": "0x2222...",
        "did": "did:dedata:0x2222...",
        "totalTokens": "5000.25",
        "lastCheckinAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 4. 签到相关

#### POST /api/checkin
发起签到

**请求头**:
```
Authorization: Bearer <token>
```

**请求**:
```bash
curl -X POST http://localhost:8080/api/checkin \
  -H "Authorization: Bearer <token>"
```

**成功响应(签到发起成功)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "checkin-uuid",
    "userID": "user-uuid",
    "status": "issuing",
    "tokenAmount": null,
    "txHash": null,
    "failureReason": null,
    "issuedAt": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误响应示例**:

1. 冷却时间未到:
```json
{
  "code": 400,
  "message": "please wait 12h30m before next checkin",
  "data": null
}
```

2. 有正在发放中的签到:
```json
{
  "code": 400,
  "message": "you have a checkin in progress, please wait",
  "data": null
}
```

3. 外部签到失败:
```json
{
  "code": 400,
  "message": "external checkin failed: ...",
  "data": null
}
```

#### GET /api/checkin/my
获取我的签到记录

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码,默认 1
- `pageSize`: 每页数量,默认 10,最大 100

**请求**:
```bash
curl "http://localhost:8080/api/checkin/my?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "checkin-uuid",
        "userID": "user-uuid",
        "status": "success",
        "tokenAmount": "10",
        "txHash": "0xabcd...",
        "failureReason": null,
        "issuedAt": "2024-01-01T00:05:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:05:00Z"
      },
      {
        "id": "checkin-uuid2",
        "userID": "user-uuid",
        "status": "issue_failed",
        "tokenAmount": null,
        "txHash": null,
        "failureReason": "insufficient gas",
        "issuedAt": null,
        "createdAt": "2023-12-31T00:00:00Z",
        "updatedAt": "2023-12-31T00:00:05Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

#### GET /api/checkin/summary
获取签到统计信息

**请求头**:
```
Authorization: Bearer <token>
```

**请求**:
```bash
curl http://localhost:8080/api/checkin/summary \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalTokens": "1000.5",
    "lastCheckinAt": "2024-01-01T00:00:00Z",
    "dailyStats": [
      {
        "date": "2024-01-01",
        "token_amount": 10
      },
      {
        "date": "2023-12-31",
        "token_amount": 10
      },
      {
        "date": "2023-12-30",
        "token_amount": 10
      }
    ]
  }
}
```

---

## 签到状态说明

签到记录有 4 种状态:

1. **external_failed**: 外部签到 API 调用失败
   - 直接返回错误,不会继续发放 token
   - 有 `failureReason` 字段说明失败原因

2. **issuing**: 正在发放中
   - 外部签到成功,等待后台 Worker 发放 token
   - 此时 `tokenAmount` 和 `txHash` 为 null

3. **success**: 发放成功
   - Worker 成功发放 token
   - 有 `tokenAmount`、`txHash` 和 `issuedAt` 字段
   - 用户的 `totalTokens` 和 `lastCheckinAt` 已更新

4. **issue_failed**: 发放失败
   - Worker 发放 token 时失败
   - 有 `failureReason` 字段说明失败原因
   - 用户的 `totalTokens` 和 `lastCheckinAt` 未更新

---

## 错误码说明

| HTTP 状态码 | 说明 |
|-----------|------|
| 200 | 成功 |
| 400 | 请求参数错误或业务逻辑错误 |
| 401 | 未认证或认证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 认证流程

1. 客户端调用 `POST /api/auth/nonce` 获取 nonce
2. 客户端使用钱包对 nonce 进行签名
3. 客户端调用 `POST /api/auth/verify` 提交签名
4. 服务端验证签名,返回 JWT token
5. 后续请求在 Header 中携带 `Authorization: Bearer <token>`

---

## 签到流程

1. 用户调用 `POST /api/checkin` 发起签到
2. 服务端检查:
   - 用户是否存在
   - 距离上次签到是否满 24 小时
   - 是否有正在发放中的签到
3. 调用外部签到 API
4. 创建 `issuing` 状态的签到记录并返回
5. 后台 Worker 每 5 秒查询 `issuing` 状态的记录
6. Worker 调用 TokenIssuer 发放 token
7. 发放成功后更新签到记录为 `success`,并更新用户的 `totalTokens` 和 `lastCheckinAt`
8. 发放失败则更新签到记录为 `issue_failed`

---

## 注意事项

1. **JWT Token 过期时间**: 默认 24 小时,可在配置文件中修改
2. **签到冷却时间**: 固定 24 小时,从上次签到成功时间计算
3. **Token 精度**: 使用 decimal(36,18) 存储,支持高精度
4. **排行榜**: 按 `totalTokens` 降序排列
5. **并发控制**: 通过检查 `issuing` 状态防止重复签到
