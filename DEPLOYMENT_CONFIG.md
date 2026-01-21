# 部署配置指南

本文档说明了部署时需要配置的环境变量。配置分为两部分：
1. **GitHub Secrets**：在 GitHub 仓库设置中配置（用于 CI/CD）
2. **服务器 .env 文件**：通过 `DEPLOY_ENV` Secret 注入到服务器

---

## 一、GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

### 1.1 部署相关（必需）
| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `DEPLOY_HOST` | 服务器地址 | `66.154.126.168` |
| `DEPLOY_USER` | SSH 用户名 | `root` |
| `DEPLOY_KEY` | SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `DEPLOY_PORT` | SSH 端口（可选） | `22` |
| `DEPLOY_PATH` | 部署路径（可选） | `/opt/dedata` |

### 1.2 环境变量（DEPLOY_ENV）

`DEPLOY_ENV` Secret 包含所有需要注入到服务器的环境变量，格式为标准的 `.env` 文件内容。

---

## 二、服务器环境变量配置（DEPLOY_ENV 内容）

### 2.1 基础配置（必需）

```bash
# 运行环境
ENV=production

# 数据库配置
DB_USER=postgres
DB_PASSWORD=your-secure-password-here
DB_NAME=dedata

# Redis 配置
REDIS_PASSWORD=your-redis-password-here

# JWT 配置
JWT_SECRET=your-jwt-secret-key-here

# Session 配置
SESSION_SECRET=your-session-secret-here
```

### 2.2 支付网关配置（X402）

```bash
# X402 Payment Gateway
X402_BASE_URL=http://66.154.126.168:8086
X402_API_TOKEN=my-plain-token-123
X402_MERCHANT_ID=1
```

### 2.3 区块链配置（签到奖励发放）

```bash
# Blockchain Configuration
BLOCKCHAIN_PRIVATE_KEY=your-private-key-here  # ⚠️ 重要：保密！
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_CONTRACT_ADDRESS=0x0f17A994aa42a9E42584BAF0246B973D1C641FFd
```

### 2.4 签到奖励配置（可选）

```bash
# CheckIn Reward Settings
CHECKIN_REWARD_AMOUNT=10
CHECKIN_PROCESS_INTERVAL=30
```

### 2.5 日志配置（可选）

```bash
# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2.6 API URL 配置（前端）

```bash
# Frontend API URL
NEXT_PUBLIC_API_URL=http://your-server-ip:8081
```

---

## 三、完整的 DEPLOY_ENV 示例

将以下内容复制到 GitHub Secrets 的 `DEPLOY_ENV` 中（替换实际值）：

```bash
# Environment
ENV=production

# Database
DB_USER=postgres
DB_PASSWORD=change-this-to-secure-password
DB_NAME=dedata

# Redis
REDIS_PASSWORD=change-this-to-secure-password

# JWT & Session
JWT_SECRET=change-this-to-random-secret-key
SESSION_SECRET=change-this-to-random-secret-key

# X402 Payment Gateway
X402_BASE_URL=http://66.154.126.168:8086
X402_API_TOKEN=my-plain-token-123
X402_MERCHANT_ID=1

# Blockchain (for token rewards)
BLOCKCHAIN_PRIVATE_KEY=your-wallet-private-key-here
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_CONTRACT_ADDRESS=0x0f17A994aa42a9E42584BAF0246B973D1C641FFd

# CheckIn Settings
CHECKIN_REWARD_AMOUNT=10
CHECKIN_PROCESS_INTERVAL=30

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Frontend
NEXT_PUBLIC_API_URL=http://66.154.126.168:8081
```

---

## 四、当前配置问题

### 4.1 环境变量名称不匹配

**问题**：`config.go` 使用下划线命名（如 `DATABASE_HOST`），但 `docker-compose.yml` 使用前缀命名（如 `DB_HOST`）

**解决方案**：需要统一环境变量命名

| 配置项 | config.go 期望 | docker-compose.yml 当前 | 建议统一为 |
|--------|---------------|------------------------|-----------|
| 数据库主机 | `DATABASE_HOST` | `DB_HOST` | `DB_HOST` |
| 数据库端口 | `DATABASE_PORT` | `DB_PORT` | `DB_PORT` |
| 数据库用户 | `DATABASE_USER` | `DB_USER` | `DB_USER` |
| 数据库密码 | `DATABASE_PASSWORD` | `DB_PASSWORD` | `DB_PASSWORD` |
| 数据库名称 | `DATABASE_DBNAME` | `DB_NAME` | `DB_NAME` |

### 4.2 配置文件硬编码问题

**config.production.yaml 中的硬编码值**：
- Line 12: `dbname: dedata_prod` - 应该是 `dedata`
- Line 33: `base_url: "http://66.154.126.168:8086"` - 可以接受
- Line 50: `private_key: ""` - 正确，通过环境变量覆盖

---

## 五、修复建议

### 5.1 立即修复

1. **修改 config.production.yaml**：
   - 将 `dbname: dedata_prod` 改为 `dbname: dedata`

2. **确保 DEPLOY_ENV 包含所有必需变量**

### 5.2 长期改进

1. **统一环境变量命名**：修改 config.go 以匹配 docker-compose.yml 的命名
2. **移除配置文件中的敏感信息**：确保所有敏感配置都通过环境变量覆盖
3. **添加配置验证**：启动时检查必需的环境变量是否存在

---

## 六、快速检查清单

部署前确保已配置：

- [ ] GitHub Secrets 中的 `DEPLOY_HOST`
- [ ] GitHub Secrets 中的 `DEPLOY_USER`
- [ ] GitHub Secrets 中的 `DEPLOY_KEY`
- [ ] GitHub Secrets 中的 `DEPLOY_ENV`（包含所有上述环境变量）
- [ ] 数据库密码已修改（不使用默认值）
- [ ] Redis 密码已修改（不使用默认值）
- [ ] JWT Secret 已修改为随机字符串
- [ ] Session Secret 已修改为随机字符串
- [ ] Blockchain Private Key 已正确配置
- [ ] NEXT_PUBLIC_API_URL 指向正确的后端地址

---

## 七、安全注意事项

⚠️ **永远不要**将以下信息提交到 Git 仓库：
- 数据库密码
- Redis 密码
- JWT Secret
- Session Secret
- Blockchain Private Key
- API Tokens

✅ **正确做法**：
- 所有敏感信息只存储在 GitHub Secrets 中
- 配置文件中使用空字符串或占位符
- 通过环境变量在运行时注入实际值
