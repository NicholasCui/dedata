# 用户认证技术方案

## 一、核心理念：钱包地址 = 身份 ID，签名 = 密码

跟传统用户名密码不同：

用户 ID：wallet_address（0x...）

身份证明：签名一段后端给的随机消息（nonce + 其他字段）

认证方式：后端验证「这段消息，确实是这个地址的私钥签出来的」

所以后端的核心是两步：

给前端一个一次性的 challenge（nonce）

收到签名后，验证签名，通过就发 session / JWT

## 二、标准登录流程（后端视角）

我们设计三条核心 API（REST 举例）：

* POST /auth/nonce —— 生成登录用的 nonce

* POST /auth/verify —— 验签 + 登录 / 注册

* GET /me（或其他受保护接口）—— 用 JWT 访问

### 1. POST /auth/nonce

请求：
```json
POST /auth/nonce
{
  "address": "0x1234...abcd",
  "chainId": 80002
}
```

后端逻辑：

1. 校验 address 格式
2. 生成随机 nonce，比如 32 字节随机字符串
3. 写入数据库 login_challenges（或放 Redis）：
   * address
   * nonce
   * chain_id
   * expires_at（比如 5 分钟）

返回 nonce + 可以顺便返回一整段要签的 message 模板（推荐直接用 SIWE/自定义结构化文案）

响应示例（简单版）：
```json
{
  "nonce": "a3f0c2...",
  "message": "Login to DeData at 2025-11-24T00:15:00Z\nAddress: 0x1234...abcd\nNonce: a3f0c2...\nChainId: 80002",
  "expireAt": // 过期时间
}
```

前端用这个 message 调 eth_sign / personal_sign 之类，让用户在钱包里签名。

最好是结构化的 message（例如 SIWE：EIP-4361），后面可以自然扩展更多字段。

### 2. POST /auth/verify

钱包签完名之后发给后端。

请求：
```json
POST /auth/verify
{
  "address": "0x1234...abcd",
  "chainId": 80002,
  "message": "Login to DeData at ...",
  "signature": "0xabcdef..."
}
```

后端逻辑步骤：

从 DB/Redis 找到之前存的 challenge（通过 address 或 nonce）

1. 检查：
   * nonce 是否存在
   * nonce 是否未过期
   * chainId 是否匹配

2. 用签名恢复出签名者地址（ecrecover 或库函数）
   * recoveredAddress 是否等于 address（大小写不敏感）

3. 校验 message 内容是否符合你定义的格式，尤其要确保包含：
   * nonce
   * 你的域名 / app 名（防止钓鱼）
   * chainId
   * 有效期（可选）
   
4. 验证通过后：
   * 删除 / 标记已用 nonce（防止重放）
   * 在 users 表里查有没有这个地址：
     * 如果没有，就创建新用户（注册）
   * 为这个用户创建 session：
     * 返回一个 JWT

响应示例（JWT）：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u_123",
    "address": "0x1234...abcd",
    "profileCompleted": false
  }
}
```

后续前端带 Authorization: Bearer <token> 访问受保护 API。

### 3. 受保护接口校验（GET /me）

请求头：
```json
GET /me
Authorization: Bearer <token>
```

后端逻辑：
1. 验证 JWT 签名是否有效

2. 提取用户 ID / 地址

3. 返回用户基础信息 / Profile / 权限等

只要 token 合法，就认为用户已经通过钱包登录。
