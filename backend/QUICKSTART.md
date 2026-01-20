# DeData Backend - 快速开始

## 生产环境部署

### 方式一：使用自动化脚本（推荐）

#### 1. 准备环境变量
```bash
# 创建配置目录
sudo mkdir -p /etc/dedata

# 复制环境变量模板
sudo cp .env.production.example /etc/dedata/production.env

# 编辑配置文件
sudo nano /etc/dedata/production.env
```

填入实际的配置信息：
- 数据库连接信息
- Redis 连接信息
- JWT Secret（使用 `openssl rand -base64 32` 生成）
- x402 支付服务配置
- 区块链 RPC 和私钥

#### 2. 运行部署脚本
```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署（需要 root 权限）
sudo ./deploy.sh
```

脚本会自动完成：
- ✅ 检查环境变量
- ✅ 测试数据库连接
- ✅ 运行数据库迁移
- ✅ 编译应用
- ✅ 创建 systemd 服务
- ✅ 启动服务
- ✅ 健康检查

#### 3. 验证部署
```bash
# 查看服务状态
sudo systemctl status dedata

# 查看日志
sudo journalctl -u dedata -f

# 测试健康检查
curl http://localhost:8080/api/health
```

### 方式二：使用 Docker Compose

#### 1. 准备环境变量
```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑配置文件
nano .env.production
```

#### 2. 运行 Docker Compose
```bash
# 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f app
```

#### 3. 运行数据库迁移
```bash
# 进入应用容器
docker exec -it dedata-backend sh

# 安装 migrate 工具（如果需要）
apk add --no-cache curl
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
mv migrate /usr/local/bin/

# 运行迁移
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?sslmode=disable"
migrate -path ./migrations -database "$DATABASE_URL" up

# 退出容器
exit
```

### 方式三：手动部署

详细步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 文档。

---

## 配置 Nginx 反向代理（推荐）

### 1. 安装 Nginx
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. 创建配置文件
```bash
sudo nano /etc/nginx/sites-available/dedata
```

粘贴以下配置：
```nginx
upstream dedata_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name api.yourdomain.com;

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

### 3. 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/dedata /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 SSL（Let's Encrypt）
```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 验证自动续期
sudo certbot renew --dry-run
```

---

## 配置数据库备份

### 1. 创建备份脚本
```bash
sudo nano /usr/local/bin/backup-dedata-db.sh
```

粘贴以下内容：
```bash
#!/bin/bash
set -e

# 加载环境变量
source /etc/dedata/production.env

# 配置
BACKUP_DIR="/backups/dedata"
DATE=$(date +%Y%m%d_%H%M%S)
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

### 2. 设置权限和定时任务
```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/backup-dedata-db.sh

# 添加定时任务（每天凌晨2点）
sudo crontab -e
# 添加：
# 0 2 * * * /usr/local/bin/backup-dedata-db.sh >> /var/log/dedata/backup.log 2>&1
```

---

## 常用命令

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

# 查看日志
sudo journalctl -u dedata -f

# 应用日志
sudo tail -f /var/log/dedata/app.log

# 错误日志
sudo tail -f /var/log/dedata/error.log
```

### Docker Compose
```bash
# 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 停止所有服务
docker compose -f docker-compose.prod.yml down

# 重启应用
docker compose -f docker-compose.prod.yml restart app

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 进入容器
docker exec -it dedata-backend sh
```

### 数据库操作
```bash
# 连接数据库
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# 查看表
\dt

# 查看签到记录
SELECT id, user_id, status, created_at FROM check_ins ORDER BY created_at DESC LIMIT 10;

# 查看待处理任务
SELECT count(*) FROM check_ins WHERE status IN ('payment_success', 'issuing');
```

---

## 监控和维护

### 健康检查
```bash
# 检查 API 健康
curl http://localhost:8080/api/health

# 应该返回：
# {"status":"ok","timestamp":"2025-12-03T10:00:00Z"}
```

### 查看系统资源
```bash
# CPU 和内存使用
top -p $(pgrep dedata-backend)

# 磁盘使用
df -h

# 数据库连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname='dedata_prod';"
```

### 日志轮转
```bash
# 配置日志轮转
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

---

## 故障排查

### 服务无法启动
```bash
# 查看详细错误
sudo journalctl -u dedata -n 100 --no-pager

# 检查配置
cat /opt/dedata/config/config.production.yaml

# 检查环境变量
sudo -u dedata env | grep DB_
```

### 数据库连接失败
```bash
# 测试连接
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# 检查网络
telnet $DB_HOST $DB_PORT
```

### Worker 不处理任务
```bash
# 查看 issuing 状态记录
psql $DATABASE_URL -c "SELECT id, status, issue_tx_hash, created_at FROM check_ins WHERE status='issuing' ORDER BY created_at DESC LIMIT 5;"

# 重启服务
sudo systemctl restart dedata
```

---

## 安全建议

1. ✅ 使用强密码（至少 24 字符）
2. ✅ 定期轮换密钥（JWT Secret、数据库密码）
3. ✅ 配置防火墙，只开放必要端口
4. ✅ 使用 SSL/TLS 加密通信
5. ✅ 定期更新系统和依赖
6. ✅ 配置日志审计
7. ✅ 定期备份数据库
8. ✅ 监控异常访问和错误

---

## 性能优化

### 数据库
- 定期 VACUUM 和 ANALYZE
- 监控慢查询
- 适当调整连接池大小

### Redis
- 配置内存限制和淘汰策略
- 启用持久化（AOF）

### 应用
- Worker 间隔根据负载调整
- 监控 goroutine 和内存使用

---

## 获取帮助

- 📖 详细文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 问题报告: GitHub Issues
- 📧 技术支持: support@yourdomain.com

---

## 检查清单

部署前：
- [ ] 所有环境变量已配置
- [ ] 数据库已创建
- [ ] Redis 已安装
- [ ] RPC 节点已准备
- [ ] x402 服务已配置

部署后：
- [ ] 服务运行正常
- [ ] 健康检查通过
- [ ] 数据库迁移完成
- [ ] Nginx 配置正确
- [ ] SSL 证书有效
- [ ] 备份脚本已设置
- [ ] 监控已启用

祝部署顺利！🚀
