# DeData Backend - 一键部署指南

## 🚀 快速开始（3步完成部署）

### 前提条件
- Ubuntu/Debian Linux 系统
- 安装了 Docker 和 Docker Compose
- 安装了 Go 1.21+
- 有 sudo 权限

### 一键部署

```bash
# 1. 赋予执行权限
chmod +x deploy-all.sh

# 2. 运行部署脚本（需要 root 权限）
sudo ./deploy-all.sh

# 脚本会引导你创建 .env 文件并配置必需项
# 3. 完成！🎉
```

脚本会自动完成：
- ✅ 启动数据库容器（PostgreSQL + Redis）
- ✅ 配置环境变量
- ✅ 运行数据库迁移
- ✅ 编译应用程序
- ✅ 创建并启动 systemd 服务
- ✅ 验证部署状态

---

## 📋 部署流程详解

### 步骤 1: 启动数据库容器
脚本会自动使用 Docker Compose 启动：
- PostgreSQL 14 (端口 5432)
- Redis 7 (端口 6379)

### 步骤 2: 配置环境变量

**配置文件位置：** 项目根目录的 `.env` 文件

**配置方式：**

1. **自动从 .env.example 创建（推荐）**
   ```bash
   # 部署脚本会自动提示从 .env.example 创建 .env
   # 然后打开编辑器让你配置必需项
   ```

2. **手动创建**
   ```bash
   cp .env.example .env
   nano .env
   ```

**必需配置项：**
- ✅ `DB_PASSWORD` - 数据库密码
- ✅ `REDIS_PASSWORD` - Redis 密码
- ✅ `JWT_SECRET` - JWT 密钥（建议: `openssl rand -base64 32`）
- ✅ `BLOCKCHAIN_PRIVATE_KEY` - 区块链私钥
- ⚠️ `X402_API_TOKEN` - x402 API token（可选）
- ⚠️ `X402_MERCHANT_ID` - x402 商户 ID（可选）

**安全特性：**
- ✅ 所有配置集中在项目根目录的 `.env` 文件
- ✅ 不再硬编码任何密码
- ✅ Docker Compose 和 systemd 服务共享同一配置源
- ✅ 配置文件自动设置为 600 权限

### 步骤 3: 运行数据库迁移
自动创建所有必需的表：
- `users` - 用户表
- `profiles` - 用户资料表
- `login_challenges` - 登录挑战表
- `check_ins` - 签到记录表

### 步骤 4: 编译应用
编译优化版本：
```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o dedata-backend ./cmd/api
```

### 步骤 5: 部署服务
- 创建部署目录：`/opt/dedata`
- 创建日志目录：`/var/log/dedata`
- 创建 systemd 服务
- 启动服务

### 步骤 6: 验证部署
自动测试：
- 服务状态
- 健康检查接口
- 数据库连接

---

## 🔧 常用命令

### 服务管理
```bash
# 启动服务
sudo systemctl start dedata

# 停止服务
sudo systemctl stop dedata

# 重启服务
sudo systemctl restart dedata

# 查看状态
sudo systemctl status dedata

# 查看实时日志
sudo journalctl -u dedata -f
```

### 数据库管理
```bash
# 连接 PostgreSQL
docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod

# 查看所有表
\dt

# 查看用户
SELECT * FROM users LIMIT 5;

# 查看签到记录
SELECT id, user_id, status, created_at FROM check_ins ORDER BY created_at DESC LIMIT 10;

# 退出
\q
```

### Docker 容器管理
```bash
# 查看运行的容器
docker ps | grep dedata

# 查看数据库日志
docker logs -f dedata-postgres

# 查看 Redis 日志
docker logs -f dedata-redis

# 停止所有容器
docker compose -f docker-compose.db.yml down

# 重启容器
docker compose -f docker-compose.db.yml restart
```

### 日志查看
```bash
# 实时查看应用日志
sudo tail -f /var/log/dedata/app.log

# 实时查看错误日志
sudo tail -f /var/log/dedata/error.log

# 查看系统日志（最近100行）
sudo journalctl -u dedata -n 100 --no-pager

# 查看今天的日志
sudo journalctl -u dedata --since today
```

---

## 🧪 测试部署

### 1. 健康检查
```bash
curl http://localhost:8080/api/health
# 应该返回: {"status":"ok","timestamp":"..."}
```

### 2. 获取登录 Nonce
```bash
curl -X POST http://localhost:8080/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

### 3. 查看数据库数据
```bash
docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod -c "SELECT count(*) FROM users;"
```

---

## 🔒 安全配置

### 密码管理

**配置文件位置：**
- 项目根目录: `.env`
- 部署目录: `/opt/dedata/.env` (从项目根目录复制)

**查看配置：**
```bash
# 查看项目配置
cat .env | grep -E "PASSWORD|SECRET|PRIVATE_KEY"

# 查看部署配置
sudo cat /opt/dedata/.env | grep -E "PASSWORD|SECRET|PRIVATE_KEY"
```

**修改配置：**
```bash
# 1. 编辑项目根目录的 .env
nano .env

# 2. 重新部署（会自动复制到 /opt/dedata/.env）
sudo ./deploy-all.sh

# 或手动复制并重启服务
sudo cp .env /opt/dedata/.env
sudo chmod 600 /opt/dedata/.env
sudo systemctl restart dedata
```

### 防火墙配置
```bash
# 允许 8080 端口
sudo ufw allow 8080/tcp

# 启用防火墙
sudo ufw enable
```

---

## 📊 部署架构

```
┌─────────────────────────────────────────┐
│         Internet / Users                │
└───────────────┬─────────────────────────┘
                │
                ↓
┌───────────────────────────────────────────┐
│      Nginx (可选，推荐配置 SSL)           │
│      Port: 80/443                         │
└───────────────┬───────────────────────────┘
                │
                ↓
┌───────────────────────────────────────────┐
│      DeData Backend (Systemd)             │
│      Port: 8080                           │
│      /opt/dedata/dedata-backend           │
└────┬──────────┬──────────┬────────────────┘
     │          │          │
     ↓          ↓          ↓
┌─────────┐ ┌──────┐ ┌────────────┐
│PostgreSQL│ │Redis │ │Polygon RPC │
│  Docker  │ │Docker│ │  (Alchemy) │
│  :5432   │ │:6379 │ │            │
└──────────┘ └──────┘ └────────────┘
```

---

## 🚨 故障排查

### 服务无法启动
```bash
# 查看详细错误
sudo journalctl -u dedata -n 100 --no-pager

# 检查配置文件
cat /opt/dedata/config/config.production.yaml

# 检查环境变量
sudo cat /etc/dedata/production.env

# 测试应用（不使用 systemd）
cd /opt/dedata
sudo -u dedata ./dedata-backend
```

### 数据库连接失败
```bash
# 测试数据库连接
docker exec dedata-postgres psql -U dedata_admin -d dedata_prod -c "SELECT 1;"

# 检查容器状态
docker ps | grep dedata

# 查看数据库日志
docker logs dedata-postgres
```

### 端口被占用
```bash
# 查看占用 8080 端口的进程
sudo lsof -i :8080

# 杀死进程
sudo kill -9 <PID>
```

### Worker 不处理任务
```bash
# 查看 issuing 状态的记录
docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod -c \
  "SELECT id, status, issue_tx_hash, created_at FROM check_ins WHERE status IN ('issuing', 'payment_success') ORDER BY created_at DESC LIMIT 5;"

# 检查 worker 日志
sudo journalctl -u dedata | grep -i worker

# 重启服务
sudo systemctl restart dedata
```

---

## 🔄 重置环境

### 清理 Docker 资源

如果遇到问题需要完全重置 Docker 环境：

```bash
# 运行清理脚本
chmod +x cleanup-docker.sh
./cleanup-docker.sh
```

**清理脚本会执行：**
- ✅ 停止所有 DeData 容器
- ✅ 删除所有 DeData 容器
- ✅ 删除数据卷（包括所有数据库数据）
- ✅ 删除 Docker 网络
- ⚠️ 可选：删除 Docker 镜像

**手动清理步骤：**
```bash
# 1. 停止并删除容器
docker compose -f docker-compose.db.yml down -v

# 2. 删除数据卷
docker volume rm dedata-backend_postgres_data
docker volume rm dedata-backend_redis_data

# 3. 查看所有相关资源
docker ps -a | grep dedata
docker volume ls | grep dedata

# 4. 重新部署
sudo ./deploy-all.sh
```

---

## 🔄 更新部署

### 更新应用代码
```bash
# 1. 停止服务
sudo systemctl stop dedata

# 2. 拉取最新代码
git pull

# 3. 运行部署脚本
sudo ./deploy-all.sh

# 脚本会自动编译新版本并重启服务
```

### 回滚到之前的版本
```bash
# 1. 停止服务
sudo systemctl stop dedata

# 2. 恢复旧版本
sudo cp /opt/dedata/dedata-backend.backup /opt/dedata/dedata-backend

# 3. 启动服务
sudo systemctl start dedata
```

---

## 📦 卸载

### 完全卸载
```bash
# 1. 停止并删除服务
sudo systemctl stop dedata
sudo systemctl disable dedata
sudo rm /etc/systemd/system/dedata.service
sudo systemctl daemon-reload

# 2. 停止并删除容器
docker compose -f docker-compose.db.yml down -v

# 3. 删除文件
sudo rm -rf /opt/dedata
sudo rm -rf /var/log/dedata
sudo rm -rf /etc/dedata

# 4. 删除用户
sudo userdel dedata
```

---

## 📚 更多文档

- **完整部署文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **快速开始**: [QUICKSTART.md](./QUICKSTART.md)
- **API 文档**: 运行后访问 `/api/docs`

---

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/your-org/dedata-backend/issues
- **技术支持**: support@yourdomain.com
- **Discord**: https://discord.gg/your-server

---

## ✅ 检查清单

部署前：
- [ ] 服务器满足最低要求（2核4G+）
- [ ] Docker 已安装
- [ ] Go 1.21+ 已安装
- [ ] 有 sudo 权限

部署后：
- [ ] 服务运行正常 (`systemctl status dedata`)
- [ ] 健康检查通过 (`curl localhost:8080/api/health`)
- [ ] 数据库迁移完成
- [ ] 可以创建用户和签到
- [ ] Worker 正常处理任务

生产环境额外检查：
- [ ] 修改了所有默认密码
- [ ] 配置了 Nginx 反向代理
- [ ] 配置了 SSL 证书
- [ ] 设置了数据库备份
- [ ] 配置了监控和告警

祝部署顺利！🚀
