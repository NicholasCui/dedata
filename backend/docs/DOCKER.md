# Docker 环境配置说明

## 本地开发环境

### 启动服务

```bash
# 启动数据库和 Redis
docker compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker compose -f docker-compose.dev.yml ps

# 查看日志
docker compose -f docker-compose.dev.yml logs -f
```

### 停止服务

```bash
# 停止服务
docker compose -f docker-compose.dev.yml down

# 停止并删除数据卷（警告：会删除所有数据）
docker compose -f docker-compose.dev.yml down -v
```

### 连接信息

- **PostgreSQL**
  - Host: `localhost`
  - Port: `5432`
  - User: `postgres`
  - Password: `postgres`
  - Database: `dedata_dev`

- **Redis**
  - Host: `localhost`
  - Port: `6379`
  - Password: 无

### 运行 Go 应用

```bash
# 确保 Docker 服务已启动
docker compose -f docker-compose.dev.yml up -d

# 运行应用
go run cmd/api/main.go

# 或者设置环境变量
GO_ENV=development go run cmd/api/main.go
```

---

## 生产环境

### 配置环境变量

1. 复制环境变量模板：
```bash
cp .env.prod.example .env.prod
```

2. 编辑 `.env.prod` 文件，设置强密码：
```bash
vim .env.prod
```

### 启动服务

```bash
# 使用环境变量文件启动
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 停止服务

```bash
# 停止服务
docker compose -f docker-compose.prod.yml down

# 停止并删除数据卷（警告：会删除所有数据）
docker compose -f docker-compose.prod.yml down -v
```

### 备份和恢复

#### PostgreSQL 备份

```bash
# 备份数据库
docker exec dedata-postgres-prod pg_dump -U dedata dedata_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i dedata-postgres-prod psql -U dedata dedata_prod < backup.sql
```

#### Redis 备份

```bash
# 备份 Redis 数据
docker exec dedata-redis-prod redis-cli --raw SAVE
docker cp dedata-redis-prod:/data/dump.rdb ./redis_backup_$(date +%Y%m%d_%H%M%S).rdb

# 恢复 Redis 数据
docker cp redis_backup.rdb dedata-redis-prod:/data/dump.rdb
docker compose -f docker-compose.prod.yml restart redis
```

---

## 常用命令

### 进入容器

```bash
# PostgreSQL
docker exec -it dedata-postgres-dev psql -U postgres -d dedata_dev

# Redis
docker exec -it dedata-redis-dev redis-cli
```

### 查看资源使用

```bash
# 查看容器资源使用情况
docker stats dedata-postgres-dev dedata-redis-dev
```

### 清理未使用的资源

```bash
# 清理未使用的镜像、容器、网络
docker system prune -a
```

---

## 配置文件说明

### config.development.yaml

开发环境使用本地 Docker 的配置：

```yaml
database:
  host: localhost
  port: 5432
  user: postgres
  password: postgres
  dbname: dedata_dev

redis:
  host: localhost
  port: 6379
  password: ""
```

### config.production.yaml

生产环境配置（需要根据实际情况修改）：

```yaml
database:
  host: localhost  # 或实际的数据库主机
  port: 5432
  user: dedata
  password: ${DB_PASSWORD}  # 从环境变量读取
  dbname: dedata_prod

redis:
  host: localhost  # 或实际的 Redis 主机
  port: 6379
  password: ${REDIS_PASSWORD}  # 从环境变量读取
```

---

## 安全建议

1. **生产环境密码**：
   - 使用强密码（至少 16 位，包含大小写字母、数字、特殊字符）
   - 不要将 `.env.prod` 提交到版本控制

2. **网络隔离**：
   - 生产环境建议不要暴露端口到外网
   - 使用 Docker network 内部通信

3. **数据持久化**：
   - 定期备份数据库
   - 使用 volume 确保数据不会因容器删除而丢失

4. **资源限制**：
   - 可以在 docker-compose 中添加资源限制：
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

---

## 故障排查

### 数据库连接失败

1. 检查容器是否运行：
```bash
docker compose -f docker-compose.dev.yml ps
```

2. 查看数据库日志：
```bash
docker compose -f docker-compose.dev.yml logs postgres
```

3. 测试连接：
```bash
docker exec -it dedata-postgres-dev pg_isready -U postgres
```

### Redis 连接失败

1. 测试 Redis 连接：
```bash
docker exec -it dedata-redis-dev redis-cli ping
```

2. 查看 Redis 日志：
```bash
docker compose -f docker-compose.dev.yml logs redis
```

---

## .gitignore 配置

确保以下文件不被提交：

```
# Docker 环境变量
.env.prod

# 数据备份
*.sql
*.rdb

# Docker volumes 数据
postgres_*_data/
redis_*_data/
```
