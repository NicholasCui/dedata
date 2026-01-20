
# 单体服务技术方案文档（用户信息 + 签到 + 异步发放 Token + 统计 + 排行榜）

## 1. 背景与目标

### 1.1 背景

当前产品的核心业务：

- 用户通过钱包登录（此文档不涉及 auth 细节）
- 用户可维护自己的个人资料：姓名、Email、简介等
- 用户可进行每日签到（check-in）
- 签到包含两个阶段：
  1. 调用外部 checkin 接口（同步）
  2. 本服务异步发放 token（内部逻辑）
- 用户可查看签到记录、交易哈希、token 统计和折线图
- 可查看排行榜（按 token 累积量）

### 1.2 目标

设计完整技术方案，包含业务流程、数据结构、API、状态机、异步 worker，用于单体 Go 服务。

---

## 2. 系统架构

### 2.1 架构风格

- 单体服务（Go）
- 分层结构（按 package 划分）：
  - `handler`：HTTP 层（Gin）
  - `service`：业务逻辑层
  - `repository`：数据库访问层
  - `worker`：后台任务（token 发放）
  - `external`：外部 checkin API 封装
  - `middleware`：JWT / logger / CORS
  - `config`、`logger`：基础设施组件

### 2.2 技术栈

- Go + Gin
- PostgreSQL / MySQL
- Redis（可选）
- Zap 日志（或封装）

---

## 3. 数据模型设计

### 3.1 用户表 `users`

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    wallet_address  VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(64),
    email           VARCHAR(128),
    bio             TEXT,
    total_tokens    NUMERIC(36, 18) NOT NULL DEFAULT 0,
    last_checkin_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_total_tokens ON users(total_tokens DESC);
```

### 字段说明

- `wallet_address`：唯一标识用户的钱包
- `total_tokens`：累积获得的 token
- `last_checkin_at`：最近一次成功签到时间（用于 24 小时限制）

---

### 3.2 签到记录表 `checkins`

```sql
CREATE TABLE checkins (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    status          VARCHAR(32) NOT NULL,
    token_amount    NUMERIC(36, 18),
    tx_hash         VARCHAR(128),
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_at       TIMESTAMPTZ
);

CREATE INDEX idx_checkins_user_id_created_at
  ON checkins(user_id, created_at DESC);

CREATE INDEX idx_checkins_user_id_status
  ON checkins(user_id, status);
```

### 状态机

```
external_failed  外部 checkin 失败 → 终止
issuing          外部 checkin 成功，开始内部发放 token
success          token 发放成功 → 本次签到真正成功
issue_failed     token 发放失败 → 用户可重新发起签到
```

### 24 小时规则

仅 `status = 'success'` 作为有效签到。

---

## 4. 业务流程设计

### 4.1 用户信息

#### 获取用户信息

`GET /api/users/me`

返回当前用户的：

- name  
- email  
- bio  
- walletAddress  
- totalTokens  
- lastCheckinAt  

#### 更新用户信息

`PATCH /api/users/me`

可修改字段：

- name  
- email  
- bio  

---

## 4.2 签到流程（Check-in）

### 核心规则

- 外部 checkin 成功后，由本服务异步发 token
- 发放中（issuing）不能重复签到
- 发放失败（issue_failed）可继续签到
- 成功签到后 24 小时内不能再次签到

### 流程图

```
用户请求 → 检查冷却时间 → 检查是否有发放中记录
        → 调用外部 checkin → 成功？
               ↓ 否 external_failed
               是
        → 创建 issuing 记录
        → 异步 worker 发 token
                → 成功 success
                → 失败 issue_failed
```

---

## 5. API 设计

### 5.1 发起签到

`POST /api/checkins`

返回：

```json
{
  "checkinId": 123,
  "status": "issuing"
}
```

### 服务端逻辑

1. 检查最近一次成功签到是否在 24 小时内  
2. 检查是否存在 `issuing` 记录  
3. 调用外部 checkin  
4. 成功 → 创建 `issuing` 记录  
5. 失败 → 创建 `external_failed` 或直接返回错误  
6. 返回 checkin 信息（前端继续轮询）

---

### 5.2 查询签到记录

`GET /api/checkins/me`

返回每条签到数据（按时间倒序）：

- status  
- tokenAmount  
- txHash  
- failureReason  
- createdAt  
- issuedAt  

---

### 5.3 签到统计（折线图）

`GET /api/checkins/summary`

返回：

```json
{
  "totalTokens": "1234.5",
  "lastCheckinAt": "...",
  "dailyStats": [
    { "date": "2025-01-01", "tokenAmount": "10" }
  ]
}
```

SQL:

```sql
SELECT date_trunc('day', issued_at) AS day, SUM(token_amount)
FROM checkins
WHERE user_id = $1 AND status = 'success'
GROUP BY day
ORDER BY day;
```

---

### 5.4 排行榜

`GET /api/leaderboard`

简单版：

```sql
SELECT name, wallet_address, total_tokens
FROM users
ORDER BY total_tokens DESC
LIMIT 100;
```

返回：

```json
[
  {
    "rank": 1,
    "name": "Alice",
    "walletAddress": "0xabc...",
    "totalTokens": "1000"
  }
]
```

---

## 6. 异步发放 Token Worker

### 6.1 Worker 结构

- 由 main 中创建  
- `Run(ctx)` 使用 ticker 每几秒扫描 `issuing` 记录  
- 单条记录处理使用 goroutine  
- 内部流程：
  - 调用 `TokenIssuer`（链/内部逻辑）  
  - 成功 → `success`，写 txHash  
  - 失败 → `issue_failed`  
  - 成功时同时更新 `users.total_tokens` 和 `last_checkin_at`

### 6.2 示例伪代码

```go
func (w *CheckinWorker) Run(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            recs := repo.FindIssuing(...)
            for _, r := range recs {
                go w.processOne(ctx, r)
            }
        }
    }
}

func (w *CheckinWorker) processOne(ctx context.Context, c Checkin) {
    txHash, amount, err := w.issuer.IssueToken(ctx, c)
    if err != nil {
        repo.MarkIssueFailed(c.ID, err)
        return
    }
    repo.MarkSuccessAndUpdateUser(c.ID, txHash, amount)
}
```

---

## 7. 并发与一致性

### 7.1 防止重复签到

在事务中：

1. SELECT user FOR UPDATE  
2. 校验 last_checkin_at  
3. 校验无 issuing 记录  
4. 写入新记录

### 7.2 错误重试

失败状态：

- `external_failed`：用户可立即重新签到  
- `issue_failed`：用户可重新签到  
- worker 内可加入有限次数的自动重试（根据业务需要）

---

## 8. 文件结构建议

```
/internal
    /handler
        checkin_handler.go
        user_handler.go
    /service
        checkin_service.go
        user_service.go
    /repository
        user_repo.go
        checkin_repo.go
    /worker
        checkin_worker.go
    /external
        external_checkin.go
        token_issuer.go
/config
/logger
/cmd/server/main.go
```

---

## 9. 后续可扩展点

- 用户更多资料字段
- 任务队列（如果未来需要高并发发放）
- 丰富排行榜维度（本周、本月、连续签到天数等）
- 添加签到 streak（连续签到奖励）
- 发放失败的自动重试策略统一配置化
- 前端主动轮询 → websocket 推送

---

## 10. 总结

本方案提供了：

- 完整数据结构  
- 签到状态机  
- 24 小时冷却  
- 异步 token 发放  
- API 设计  
- 排行榜 & 统计  
- Worker 模型  
- 完整目录结构  

完全贴合单体架构，便于你直接在现有 Go 后端项目中落地。
