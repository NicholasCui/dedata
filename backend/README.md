# dedata-backend

基于 Go + Gin + PostgreSQL + Redis 的后端服务，采用 Clean Architecture 架构设计。

## 功能特性

- ✅ 钱包签名认证 (Wallet-based Auth)
- ✅ JWT 无状态认证
- ✅ 每日签到系统 (24小时冷却)
- ✅ 异步 Token 发放 (Worker)
- ✅ 用户信息和统计
- ✅ 排行榜
- ✅ 数据库迁移管理
- ✅ Docker 容器化部署
- ✅ 结构化日志 (Zap)
- ✅ 配置管理 (Viper + YAML)

## 技术栈

- **语言**: Go 1.21+
- **Web 框架**: Gin
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **ORM**: GORM
- **日志**: Zap
- **配置**: Viper
- **迁移**: golang-migrate
- **容器化**: Docker + Docker Compose

## 快速开始

### 1. 安装依赖

\`\`\`bash
# 克隆仓库
git clone <repo-url>
cd dedata-backend

# 安装 Go 依赖
go mod download

# 安装 golang-migrate
make install-migrate
\`\`\`

### 2. 启动开发环境

\`\`\`bash
# 启动 Docker 容器并运行迁移
make dev-setup

# 或分步执行
make docker-up      # 启动 PostgreSQL 和 Redis
make migrate-up     # 运行数据库迁移
\`\`\`

### 3. 运行应用

\`\`\`bash
# 开发模式
make run-dev

# 或直接运行
go run cmd/api/main.go
\`\`\`

应用将在 \`http://localhost:8080\` 启动。

### 4. 测试 API

\`\`\`bash
# 健康检查
curl http://localhost:8080/api/health

# 获取签名 nonce
curl -X POST http://localhost:8080/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890abcdef1234567890abcdef12345678"}'

# 查看排行榜
curl http://localhost:8080/api/user/leaderboard
\`\`\`

## Makefile 命令

### 开发环境

\`\`\`bash
make help              # 显示所有可用命令
make dev-setup         # 一键搭建开发环境（Docker + 迁移）
make dev-reset         # 重置开发环境
make run-dev           # 运行应用（开发模式）
make build             # 编译应用
\`\`\`

### Docker 管理

\`\`\`bash
make docker-up         # 启动 Docker 容器
make docker-down       # 停止 Docker 容器
make docker-logs       # 查看容器日志
make docker-ps         # 查看容器状态
\`\`\`

### 数据库迁移

\`\`\`bash
make migrate-up        # 运行所有迁移
make migrate-down      # 回滚最后一次迁移
make migrate-version   # 查看当前迁移版本
make migrate-create NAME=xxx  # 创建新迁移
\`\`\`

## API 端点

完整的 API 文档请查看 [docs/API.md](./docs/API.md)

### 认证

- \`POST /api/auth/nonce\` - 获取签名 nonce
- \`POST /api/auth/verify\` - 验证签名并登录
- \`POST /api/auth/logout\` - 登出

### 用户

- \`GET /api/user/me\` - 获取我的信息（需认证）
- \`GET /api/user/leaderboard\` - 获取排行榜（公开）

### 签到

- \`POST /api/checkin\` - 发起签到（需认证）
- \`GET /api/checkin/my\` - 我的签到记录（需认证）
- \`GET /api/checkin/summary\` - 签到统计（需认证）

### 健康检查

- \`GET /api/health\` - 服务健康状态

## 文档

- [API 文档](./docs/API.md) - 完整的 REST API 参考
- [Docker 配置](./docs/DOCKER.md) - Docker 环境配置指南
- [数据库迁移](./docs/MIGRATION.md) - 数据库迁移管理
- [认证设计](./docs/auth.md) - 钱包签名认证设计
- [签到系统](./docs/checkin.md) - 签到系统设计

## License

MIT License
