# DeData Backend - 简化部署指南

## 🚀 架构设计

**三个 Docker 容器 + 一个 .env 文件：**

```
docker-compose.yml
├── postgres (容器1: 数据库)
├── redis    (容器2: 缓存)
└── app      (容器3: Go 应用)
     ↑
     └── 共享 .env 文件
```

## 📋 快速开始

### 1. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置（必须配置以下项）
nano .env
```

**必需配置项：**
- `DB_PASSWORD` - 数据库密码
- `REDIS_PASSWORD` - Redis 密码
- `JWT_SECRET` - JWT 密钥
- `BLOCKCHAIN_PRIVATE_KEY` - 区块链私钥

### 2. 一键部署

```bash
# 赋予执行权限
chmod +x deploy-simple.sh

# 运行部署脚本
./deploy-simple.sh
```

### 3. 完成！

脚本会自动：
- ✅ 检查 Docker 环境
- ✅ 验证配置文件
- ✅ 构建应用镜像
- ✅ 启动三个容器
- ✅ 运行数据库迁移
- ✅ 验证服务健康

## 🔧 常用命令

### 服务管理

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启服务
docker compose restart

# 重新构建并启动
docker compose up --build -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看应用日志
docker compose logs -f app
```

### 数据库操作

```bash
# 连接数据库
docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod

# 运行数据库迁移
migrate -path ./migrations -database "postgresql://dedata_admin:yourpassword@localhost:5432/dedata_prod?sslmode=disable" up

# 回滚迁移
migrate -path ./migrations -database "postgresql://..." down 1
```

### 调试

```bash
# 查看应用日志
docker compose logs -f app

# 进入应用容器
docker exec -it dedata-app sh

# 查看数据库日志
docker compose logs -f postgres

# 测试健康检查
curl http://localhost:8080/api/health
```

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新部署
./deploy-simple.sh

# 或手动重新构建
docker compose up --build -d
```

## 🧹 清理环境

```bash
# 停止并删除容器（保留数据卷）
docker compose down

# 删除容器和数据卷（完全清理）
docker compose down -v

# 或使用清理脚本
./cleanup-docker.sh
```

## 📂 项目结构

```
dedata-backend/
├── .env                    # 环境变量配置（所有服务共享）
├── .env.example           # 配置模板
├── docker-compose.yml     # Docker Compose 编排文件
├── Dockerfile             # 应用镜像构建文件
├── deploy-simple.sh       # 一键部署脚本
├── cleanup-docker.sh      # 清理脚本
├── migrations/            # 数据库迁移文件
├── config/                # 应用配置文件
├── cmd/api/              # 应用入口
└── internal/             # 内部代码
```

## 🐛 故障排查

### 应用无法启动

```bash
# 1. 查看应用日志
docker compose logs app

# 2. 检查环境变量
docker exec dedata-app env | grep -E "DB_|REDIS_|BLOCKCHAIN_"

# 3. 进入容器调试
docker exec -it dedata-app sh
```

### 数据库连接失败

```bash
# 1. 检查数据库容器状态
docker compose ps postgres

# 2. 测试数据库连接
docker exec dedata-postgres pg_isready -U dedata_admin -d dedata_prod

# 3. 查看数据库日志
docker compose logs postgres
```

### 端口被占用

```bash
# 查看占用端口的进程
sudo lsof -i :8080
sudo lsof -i :5432
sudo lsof -i :6379

# 修改 docker-compose.yml 中的端口映射
```

## 🔒 生产环境建议

1. **使用强密码**
   ```bash
   # 生成随机密码
   openssl rand -base64 32
   ```

2. **配置反向代理**（Nginx/Caddy）
   - 启用 HTTPS
   - 配置负载均衡
   - 添加访问日志

3. **数据备份**
   ```bash
   # 备份数据库
   docker exec dedata-postgres pg_dump -U dedata_admin dedata_prod > backup.sql

   # 备份数据卷
   docker run --rm -v dedata-backend_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .
   ```

4. **监控和日志**
   - 配置日志收集（ELK/Loki）
   - 配置监控告警（Prometheus/Grafana）
   - 配置健康检查

5. **资源限制**
   ```yaml
   # 在 docker-compose.yml 中添加
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

## 📊 性能优化

1. **数据库连接池**
   - 调整 `config/config.production.yaml` 中的连接池大小

2. **Redis 缓存**
   - 合理设置缓存过期时间
   - 监控缓存命中率

3. **应用优化**
   - 使用 Go pprof 分析性能
   - 优化数据库查询
   - 添加适当的索引

## 🆘 获取帮助

- 查看详细日志：`docker compose logs -f`
- GitHub Issues: [项目地址]
- 技术文档：`DEPLOYMENT.md`, `QUICKSTART.md`

---

**简化部署方案的优势：**
- ✅ 一个 docker-compose.yml 管理所有服务
- ✅ 一个 .env 文件统一配置
- ✅ 容器间自动网络连接
- ✅ 健康检查和依赖管理
- ✅ 一键部署和更新
- ✅ 易于调试和维护
