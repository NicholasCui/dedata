#!/bin/bash
# 启动数据库和 Redis 容器

set -e

echo "======================================"
echo "DeData - 启动数据库服务"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 设置默认密码（如果环境变量未设置）
export DB_PASSWORD=${DB_PASSWORD:-"dedata_dev_password_2024"}
export REDIS_PASSWORD=${REDIS_PASSWORD:-"redis_dev_password_2024"}

echo "使用的配置："
echo "  PostgreSQL Database: dedata_prod"
echo "  PostgreSQL User: dedata_admin"
echo "  PostgreSQL Password: ${DB_PASSWORD}"
echo "  PostgreSQL Port: 5432"
echo ""
echo "  Redis Password: ${REDIS_PASSWORD}"
echo "  Redis Port: 6379"
echo ""

# 启动数据库服务
echo "启动 PostgreSQL 和 Redis 容器..."
docker compose -f docker-compose.db.yml up -d

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 5

# 检查 PostgreSQL
echo ""
echo "检查 PostgreSQL 状态..."
if docker exec dedata-postgres pg_isready -U dedata_admin -d dedata_prod > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL 运行正常"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL 可能还在启动中，请稍等片刻"
fi

# 检查 Redis
echo ""
echo "检查 Redis 状态..."
if docker exec dedata-redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✓${NC} Redis 运行正常"
else
    echo -e "${YELLOW}⚠${NC} Redis 可能还在启动中，请稍等片刻"
fi

# 显示容器状态
echo ""
echo "容器状态："
docker compose -f docker-compose.db.yml ps

echo ""
echo "======================================"
echo -e "${GREEN}数据库服务启动完成！${NC}"
echo "======================================"
echo ""
echo "数据库连接信息："
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: dedata_prod"
echo "  User: dedata_admin"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo "连接字符串："
echo "  postgresql://dedata_admin:${DB_PASSWORD}@localhost:5432/dedata_prod?sslmode=disable"
echo ""
echo "Redis 连接信息："
echo "  Host: localhost"
echo "  Port: 6379"
echo "  Password: ${REDIS_PASSWORD}"
echo ""
echo "常用命令："
echo "  查看日志:   docker compose -f docker-compose.db.yml logs -f"
echo "  停止服务:   docker compose -f docker-compose.db.yml down"
echo "  重启服务:   docker compose -f docker-compose.db.yml restart"
echo "  连接数据库: docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod"
echo "  连接Redis:  docker exec -it dedata-redis redis-cli -a ${REDIS_PASSWORD}"
echo ""
echo "下一步："
echo "  1. 配置环境变量文件: sudo nano /etc/dedata/production.env"
echo "  2. 运行部署脚本: sudo ./deploy.sh"
echo ""
