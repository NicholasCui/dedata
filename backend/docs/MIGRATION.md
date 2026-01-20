# 数据库迁移指南

本项目使用 [golang-migrate](https://github.com/golang-migrate/migrate) 进行数据库迁移管理。

## 安装

```bash
# 安装 golang-migrate 工具
make install-migrate

# 或手动安装
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

## 快速开始

### 1. 启动开发环境

```bash
# 启动 Docker 容器并运行迁移
make dev-setup

# 或分步执行
make docker-up      # 启动 PostgreSQL 和 Redis
make migrate-up     # 运行所有迁移
```

### 2. 查看当前迁移版本

```bash
make migrate-version
```

### 3. 运行应用

```bash
make run-dev
```

## 迁移命令

### 开发环境

```bash
# 运行所有待执行的迁移
make migrate-up

# 回滚最后一次迁移
make migrate-down

# 查看当前迁移版本
make migrate-version

# 强制设置迁移版本（修复损坏的迁移状态时使用）
make migrate-force VERSION=1

# 删除所有表（危险操作，会提示确认）
make migrate-drop

# 创建新的迁移文件
make migrate-create NAME=add_user_profile
```

### 测试环境

```bash
# 运行测试数据库迁移
make migrate-up-test

# 回滚测试数据库
make migrate-down-test
```

### 生产环境

```bash
# 设置环境变量
export POSTGRES_USER=your_user
export POSTGRES_PASSWORD=your_password
export POSTGRES_DB=your_database

# 运行生产迁移（会提示二次确认）
make migrate-up-prod
```

## 创建新迁移

### 1. 使用 Makefile

```bash
make migrate-create NAME=add_user_profile
```

这会在 `migrations/` 目录下创建两个文件：
- `000002_add_user_profile.up.sql` - 执行迁移的 SQL
- `000002_add_user_profile.down.sql` - 回滚迁移的 SQL

### 2. 编写迁移 SQL

**up.sql** (执行迁移):
```sql
-- migrations/000002_add_user_profile.up.sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);

CREATE INDEX idx_users_bio ON users USING gin(to_tsvector('english', bio));
```

**down.sql** (回滚迁移):
```sql
-- migrations/000002_add_user_profile.down.sql
DROP INDEX IF EXISTS idx_users_bio;

ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
```

### 3. 执行迁移

```bash
# 执行新迁移
make migrate-up

# 如果有问题，可以回滚
make migrate-down
```

## 迁移最佳实践

### 1. 总是编写 DOWN 迁移

确保每个 UP 迁移都有对应的 DOWN 迁移，以便出问题时可以回滚。

### 2. 迁移要幂等

使用 `IF EXISTS` 和 `IF NOT EXISTS`:

```sql
-- ✅ Good
CREATE TABLE IF NOT EXISTS users (...);
DROP TABLE IF EXISTS temp_table;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ❌ Bad
CREATE TABLE users (...);
DROP TABLE temp_table;
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

### 3. 按顺序执行

不要跳过迁移版本，按顺序执行所有迁移。

### 4. 不要修改已执行的迁移

一旦迁移在生产环境执行，就不要修改它。如果需要修改，创建新的迁移。

### 5. 大型数据迁移要分批

对于大表的数据迁移，考虑分批执行或在低峰期执行：

```sql
-- 分批更新示例
UPDATE users
SET status = 'active'
WHERE status IS NULL
LIMIT 1000;
```

### 6. 添加索引要在线进行

PostgreSQL 支持并发创建索引：

```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### 7. 注释和文档

为复杂的迁移添加注释：

```sql
-- Migration: Add user profiles
-- Date: 2024-01-01
-- Reason: Support user bio and avatar features
-- Related: Issue #123

ALTER TABLE users ADD COLUMN bio TEXT;
COMMENT ON COLUMN users.bio IS 'User biography, supports markdown';
```

## 故障排查

### 迁移失败

如果迁移失败，数据库会停留在部分执行状态：

```bash
# 1. 检查当前版本
make migrate-version

# 2. 查看错误信息
docker logs dedata-postgres-dev

# 3. 手动修复数据库状态
make db-connect

# 4. 强制设置版本（修复后）
make migrate-force VERSION=1

# 5. 重新执行迁移
make migrate-up
```

### dirty 状态

如果迁移显示 "dirty"，说明上次迁移失败：

```bash
# 1. 手动检查并修复数据库
make db-connect

# 2. 清理 dirty 标记
make migrate-force VERSION=当前版本号
```

### 回滚多个版本

```bash
# 回滚单个版本
make migrate-down

# 回滚多个版本（重复执行）
make migrate-down
make migrate-down
```

## 生产部署流程

### 1. 备份数据库

```bash
make db-backup
```

### 2. 运行迁移（测试环境）

```bash
make migrate-up-test
```

### 3. 测试应用

```bash
GO_ENV=test make run-test
```

### 4. 运行迁移（生产环境）

```bash
export POSTGRES_USER=prod_user
export POSTGRES_PASSWORD=strong_password
export POSTGRES_DB=dedata_prod

make migrate-up-prod
```

### 5. 验证迁移

```bash
# 检查迁移版本
POSTGRES_USER=prod_user POSTGRES_PASSWORD=pwd POSTGRES_DB=db \
~/go/bin/migrate -path ./migrations \
-database "postgresql://prod_user:pwd@host:5432/db?sslmode=require" \
version
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
- name: Run migrations
  run: |
    make install-migrate
    make migrate-up
  env:
    DB_DEV_URL: postgresql://postgres:postgres@localhost:5432/dedata_test?sslmode=disable
```

### Docker 部署

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

# Install migrate
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Copy migrations
COPY migrations /migrations

# Entry script
COPY scripts/migrate-and-run.sh /migrate-and-run.sh
RUN chmod +x /migrate-and-run.sh

CMD ["/migrate-and-run.sh"]
```

```bash
#!/bin/sh
# scripts/migrate-and-run.sh

# Run migrations
migrate -path /migrations -database "$DATABASE_URL" up

# Start application
/app/api
```

## 迁移历史

| 版本 | 文件名 | 描述 | 日期 |
|------|--------|------|------|
| 1 | 000001_init_schema | 初始化数据库schema：users, login_challenges, check_ins | 2024-11-24 |

## 数据库 Schema

当前数据库包含以下表：

### users
用户账户表，包含钱包地址和 DID
- UUID 主键
- wallet_address (唯一)
- did (唯一)
- total_tokens (高精度 decimal)
- last_checkin_at (24小时冷却检查)

### login_challenges
登录挑战表，用于钱包签名认证
- nonce (唯一)
- wallet_address
- expires_at (5分钟过期)
- used (防止重放攻击)

### check_ins
签到记录表，4状态机管理
- user_id (外键)
- status (external_failed, issuing, success, issue_failed)
- token_amount (可为空)
- tx_hash (区块链交易哈希)
- failure_reason (失败原因)
- issued_at (发放时间)

## 相关文档

- [golang-migrate 官方文档](https://github.com/golang-migrate/migrate)
- [PostgreSQL 最佳实践](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [API 文档](./API.md)
- [Docker 环境配置](./DOCKER.md)
