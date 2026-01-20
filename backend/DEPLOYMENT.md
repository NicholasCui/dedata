# DeData Backend 生产环境部署指南

## 目录
- [前置准备](#前置准备)
- [数据库设置](#数据库设置)
- [环境变量配置](#环境变量配置)
- [应用部署](#应用部署)
- [安全性检查](#安全性检查)
- [监控和备份](#监控和备份)
- [故障排查](#故障排查)

---

## 前置准备

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **磁盘**: 50GB以上 SSD
- **网络**: 公网 IP，开放端口 8080（或自定义）

### 2. 必需软件
```bash
# 安装 Go 1.21+
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 验证安装
go version

# 安装 PostgreSQL 客户端工具
sudo apt-get update
sudo apt-get install -y postgresql-client

# 安装 migrate 工具（用于数据库迁移）
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/
```

### 3. 外部服务准备
- ✅ **PostgreSQL 数据库** (推荐版本 14+)
  - 云服务：AWS RDS、Google Cloud SQL、阿里云 RDS
  - 自建：使用 Docker 或直接安装
- ✅ **Redis** (版本 6+)
  - 云服务：AWS ElastiCache、阿里云 Redis
  - 自建：使用 Docker 或直接安装
- ✅ **Polygon RPC 节点**
  - 推荐：Alchemy (https://www.alchemy.com/)
  - 备选：Infura、QuickNode
- ✅ **x402 服务**
  - 获取 API Token 和 Merchant ID

---

## 数据库设置

### 方案一：使用云数据库（推荐生产环境）

#### AWS RDS PostgreSQL
1. 创建 RDS 实例
   - 引擎：PostgreSQL 14+
   - 实例类型：db.t3.medium 或更高
   - 存储：100GB GP3 SSD
   - 备份保留期：7天
   - 多可用区：启用

2. 安全组配置
   ```
   入站规则：
   - Type: PostgreSQL
   - Port: 5432
   - Source: 你的应用服务器 IP
   ```

3. 连接信息
   ```bash
   DB_HOST=your-db.us-east-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=dedata_prod
   DB_USER=dedata_admin
   DB_PASSWORD=<strong-password>
   ```

#### 阿里云 RDS
类似流程，参考阿里云文档。

### 方案二：自建数据库（适合小规模或测试）

#### 使用 Docker 部署 PostgreSQL
```bash
# 创建数据目录
sudo mkdir -p /data/postgres
sudo chown -R 1000:1000 /data/postgres

# 运行 PostgreSQL
docker run -d \
  --name postgres \
  --restart always \
  -e POSTGRES_DB=dedata_prod \
  -e POSTGRES_USER=dedata_admin \
  -e POSTGRES_PASSWORD=your-strong-password \
  -v /data/postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:14-alpine

# 验证运行
docker ps | grep postgres
```

#### 直接安装 PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE DATABASE dedata_prod;
CREATE USER dedata_admin WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE dedata_prod TO dedata_admin;
\q
EOF
```

### 数据库迁移

#### 1. 测试连接
```bash
# 设置连接信息
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_NAME=dedata_prod
export DB_USER=dedata_admin
export DB_PASSWORD=your-password

# 测试连接
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require" -c "SELECT version();"
```

#### 2. 运行迁移
```bash
# 进入项目目录
cd /home/ubuntu/Documents/dedata-backend

# 构建数据库连接字符串
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# 运行所有迁移
migrate -path ./migrations -database "${DATABASE_URL}" up

# 验证迁移
migrate -path ./migrations -database "${DATABASE_URL}" version
```

#### 3. 验证表结构
```bash
psql "${DATABASE_URL}" -c "\dt"

# 应该看到以下表：
# - users
# - profiles
# - login_challenges
# - check_ins
# - schema_migrations
```

### Redis 设置

#### 使用 Docker 部署 Redis
```bash
# 创建数据目录
sudo mkdir -p /data/redis

# 运行 Redis
docker run -d \
  --name redis \
  --restart always \
  -p 6379:6379 \
  -v /data/redis:/data \
  redis:7-alpine redis-server --appendonly yes --requirepass "your-redis-password"

# 验证运行
redis-cli -a your-redis-password ping
# 应该返回：PONG
```

---

## 环境变量配置

### 1. 创建环境变量文件
```bash
# 创建生产环境配置文件
sudo nano /etc/dedata/production.env
```

### 2. 填写环境变量
```bash
# 数据库配置
DB_HOST=your-db-host.rds.amazonaws.com
DB_PORT=5432
DB_USER=dedata_admin
DB_PASSWORD=your-strong-db-password
DB_NAME=dedata_prod

# Redis 配置
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT 密钥（使用强随机字符串）
JWT_SECRET=$(openssl rand -base64 32)

# x402 支付服务配置
X402_BASE_URL=https://x402.yourdomain.com
X402_API_TOKEN=your-x402-api-token
X402_MERCHANT_ID=your-merchant-id

# 区块链配置
BLOCKCHAIN_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
BLOCKCHAIN_PRIVATE_KEY=your-private-key-without-0x-prefix
BLOCKCHAIN_TOKEN_ADDRESS=0x0f17A994aa42a9E42584BAF0246B973D1C641FFd

# 应用配置
APP_ENV=production
GIN_MODE=release
```

### 3. 设置文件权限
```bash
sudo chmod 600 /etc/dedata/production.env
sudo chown root:root /etc/dedata/production.env
```

### 4. 生成强密码和密钥
```bash
# JWT Secret
openssl rand -base64 32

# 数据库密码
openssl rand -base64 24

# Redis 密码
openssl rand -base64 24
```

---

## 应用部署

### 方案一：Systemd 服务（推荐）

#### 1. 编译应用
```bash
cd /home/ubuntu/Documents/dedata-backend

# 编译生产版本
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o dedata-backend ./cmd/api

# 验证编译
./dedata-backend --version
```

#### 2. 部署到生产目录
```bash
# 创建应用目录
sudo mkdir -p /opt/dedata
sudo mkdir -p /opt/dedata/config
sudo mkdir -p /var/log/dedata

# 复制文件
sudo cp dedata-backend /opt/dedata/
sudo cp config/config.production.yaml /opt/dedata/config/
sudo chmod +x /opt/dedata/dedata-backend

# 创建专用用户
sudo useradd -r -s /bin/false dedata
sudo chown -R dedata:dedata /opt/dedata
sudo chown -R dedata:dedata /var/log/dedata
```

#### 3. 创建 Systemd 服务
```bash
sudo nano /etc/systemd/system/dedata.service
```

填入以下内容：
```ini
[Unit]
Description=DeData Backend Service
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=dedata
Group=dedata
WorkingDirectory=/opt/dedata
EnvironmentFile=/etc/dedata/production.env
ExecStart=/opt/dedata/dedata-backend
Restart=always
RestartSec=10
StandardOutput=append:/var/log/dedata/app.log
StandardError=append:/var/log/dedata/error.log

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/dedata

# 资源限制
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

#### 4. 启动服务
```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start dedata

# 查看状态
sudo systemctl status dedata

# 设置开机自启
sudo systemctl enable dedata

# 查看日志
sudo journalctl -u dedata -f
# 或
sudo tail -f /var/log/dedata/app.log
```

### 方案二：Docker 部署

#### 1. 创建 Dockerfile
```bash
cat > Dockerfile <<'EOF'
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o dedata-backend ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/dedata-backend .
COPY --from=builder /app/config ./config
EXPOSE 8080
CMD ["./dedata-backend"]
EOF
```

#### 2. 构建和运行
```bash
# 构建镜像
docker build -t dedata-backend:latest .

# 运行容器
docker run -d \
  --name dedata-backend \
  --restart always \
  --env-file /etc/dedata/production.env \
  -p 8080:8080 \
  -v /var/log/dedata:/var/log/dedata \
  dedata-backend:latest

# 查看日志
docker logs -f dedata-backend
```

### 方案三：Docker Compose（完整栈）

创建 `docker-compose.prod.yml`：
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: dedata_prod
      POSTGRES_USER: dedata_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dedata_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - /etc/dedata/production.env
    ports:
      - "8080:8080"
    volumes:
      - /var/log/dedata:/var/log/dedata
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

运行：
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 安全性检查

### 1. 防火墙配置
```bash
# 使用 ufw (Ubuntu)
sudo ufw allow 8080/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# 或使用 firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 2. Nginx 反向代理（推荐）
```bash
# 安装 Nginx
sudo apt-get install -y nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/dedata
```

Nginx 配置：
```nginx
upstream dedata_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # SSL 配置（使用 Let's Encrypt）
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://dedata_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/dedata /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL 证书（Let's Encrypt）
```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo crontab -e
# 添加：0 0 * * * certbot renew --quiet
```

### 4. 密钥安全检查清单
- ✅ 私钥文件权限设置为 600
- ✅ 环境变量文件不包含在 Git 中
- ✅ 生产环境密钥与开发环境不同
- ✅ 定期轮换 JWT Secret
- ✅ 使用 KMS 或 Vault 管理密钥（高级）

---

## 监控和备份

### 1. 健康检查
```bash
# 检查服务状态
curl http://localhost:8080/api/health

# 响应示例：
# {"status":"ok","timestamp":"2025-12-03T10:00:00Z"}
```

### 2. 日志管理
```bash
# 使用 logrotate 管理日志
sudo nano /etc/logrotate.d/dedata
```

内容：
```
/var/log/dedata/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 dedata dedata
    postrotate
        systemctl reload dedata > /dev/null 2>&1 || true
    endscript
}
```

### 3. 数据库备份
```bash
# 创建备份脚本
sudo nano /usr/local/bin/backup-dedata-db.sh
```

脚本内容：
```bash
#!/bin/bash
set -e

# 配置
BACKUP_DIR="/backups/dedata"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="dedata_prod"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require" \
  | gzip > "${BACKUP_DIR}/dedata_${DATE}.sql.gz"

# 删除旧备份
find $BACKUP_DIR -name "dedata_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: dedata_${DATE}.sql.gz"
```

设置定时任务：
```bash
sudo chmod +x /usr/local/bin/backup-dedata-db.sh
sudo crontab -e
# 添加：每天凌晨2点备份
# 0 2 * * * /usr/local/bin/backup-dedata-db.sh >> /var/log/dedata/backup.log 2>&1
```

### 4. 监控指标

推荐工具：
- **Prometheus + Grafana**: 性能监控
- **Sentry**: 错误追踪
- **DataDog / New Relic**: APM 监控

基础监控脚本：
```bash
#!/bin/bash
# 监控脚本
SERVICE_URL="http://localhost:8080/api/health"

if ! curl -s -f $SERVICE_URL > /dev/null; then
    echo "Service is down!" | mail -s "DeData Service Alert" admin@yourdomain.com
    systemctl restart dedata
fi
```

---

## 故障排查

### 常见问题

#### 1. 服务无法启动
```bash
# 查看详细错误日志
sudo journalctl -u dedata -n 100 --no-pager

# 检查端口占用
sudo lsof -i :8080

# 检查配置文件
cat /opt/dedata/config/config.production.yaml

# 验证环境变量
sudo -u dedata env | grep DB_
```

#### 2. 数据库连接失败
```bash
# 测试连接
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# 检查防火墙
telnet $DB_HOST $DB_PORT

# 检查 PostgreSQL 日志
# RDS: 在 AWS 控制台查看
# 自建: sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### 3. Worker 不处理任务
```bash
# 检查 issuing 状态的记录
psql $DATABASE_URL -c "SELECT id, user_id, status, created_at FROM check_ins WHERE status IN ('issuing', 'payment_success') ORDER BY created_at DESC LIMIT 10;"

# 查看 worker 日志
sudo journalctl -u dedata | grep -i worker

# 重启服务
sudo systemctl restart dedata
```

#### 4. 区块链交易失败
```bash
# 检查 RPC 连接
curl -X POST $BLOCKCHAIN_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# 检查账户余额（需要有 MATIC 支付 gas）
# 查看日志中的 from_address，然后在 https://polygonscan.com 查询

# 检查 token 余额
# 查看日志中的 token_address 和 from_address
```

### 性能优化

1. **数据库连接池**
   - `max_idle_conns`: 20
   - `max_open_conns`: 200
   - 根据并发调整

2. **Redis 配置**
   - `pool_size`: 20
   - 启用持久化：`appendonly yes`

3. **Worker 间隔**
   - 默认 30 秒
   - 高并发可调整为 10-15 秒

### 回滚流程

如果部署出现问题：
```bash
# 1. 停止服务
sudo systemctl stop dedata

# 2. 回滚代码
cd /opt/dedata
sudo cp dedata-backend.backup dedata-backend

# 3. 回滚数据库（如果需要）
migrate -path ./migrations -database "${DATABASE_URL}" down 1

# 4. 重启服务
sudo systemctl start dedata
```

---

## 发布检查清单

部署前确认：
- [ ] 所有环境变量已设置
- [ ] 数据库迁移已运行
- [ ] 区块链 RPC 连接正常
- [ ] x402 服务配置正确
- [ ] 私钥已安全存储
- [ ] SSL 证书已配置
- [ ] 防火墙规则已设置
- [ ] 备份脚本已配置
- [ ] 监控已启用
- [ ] 日志轮转已配置

部署后验证：
- [ ] 健康检查接口返回正常
- [ ] 用户登录功能正常
- [ ] 签到流程完整
- [ ] Worker 正常处理任务
- [ ] 区块链交易成功发送
- [ ] 日志正常输出
- [ ] 数据库连接稳定

---

## 获取帮助

- **项目仓库**: https://github.com/your-org/dedata-backend
- **文档**: https://docs.yourdomain.com
- **技术支持**: support@yourdomain.com

祝部署顺利！🚀
