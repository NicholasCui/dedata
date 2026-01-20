#!/bin/bash
# DeData Backend - 简化部署脚本
# 使用 Docker Compose 部署所有服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo "======================================"
echo -e "${CYAN}DeData Backend - 一键部署${NC}"
echo "======================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

#==============================================
# 步骤 1: 检查环境
#==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 1/4: 检查环境${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker 已安装"

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose 未安装或版本过低"
    echo "请安装 Docker Compose v2"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker Compose 已安装"

#==============================================
# 步骤 2: 配置环境变量
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 2/4: 配置环境变量${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ENV_FILE="$SCRIPT_DIR/.env"

# 检查 .env 文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠${NC} 未找到 .env 文件"

    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        echo ""
        read -p "是否从 .env.example 创建 .env 文件? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
            echo -e "${GREEN}✓${NC} 已创建 .env 文件"
            echo ""
            echo -e "${RED}⚠ 重要: 请编辑 .env 文件，配置以下必需项：${NC}"
            echo "  1. DB_PASSWORD"
            echo "  2. REDIS_PASSWORD"
            echo "  3. JWT_SECRET"
            echo "  4. BLOCKCHAIN_PRIVATE_KEY"
            echo ""
            read -p "按 Enter 打开编辑器..."
            ${EDITOR:-nano} "$ENV_FILE"
        else
            echo -e "${RED}✗${NC} 无法继续部署，需要 .env 文件"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} 未找到 .env.example 文件"
        exit 1
    fi
fi

# 加载环境变量
set -a
source "$ENV_FILE"
set +a

echo -e "${GREEN}✓${NC} 环境变量已加载"

# 验证必需的环境变量
echo "验证必需的配置项..."
MISSING_VARS=()

[ -z "$DB_PASSWORD" ] && MISSING_VARS+=("DB_PASSWORD")
[ -z "$REDIS_PASSWORD" ] && MISSING_VARS+=("REDIS_PASSWORD")
[ -z "$JWT_SECRET" ] && MISSING_VARS+=("JWT_SECRET")
[ -z "$BLOCKCHAIN_PRIVATE_KEY" ] && MISSING_VARS+=("BLOCKCHAIN_PRIVATE_KEY")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}✗ 错误: 以下配置项未设置：${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "请编辑 .env 文件: nano $ENV_FILE"
    exit 1
fi

echo -e "${GREEN}✓${NC} 必需配置项验证通过"

#==============================================
# 步骤 3: 运行数据库迁移
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 3/4: 准备数据库迁移${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 migrate 工具
if ! command -v migrate &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} migrate 工具未安装，正在安装..."
    curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
    sudo mv migrate /usr/local/bin/
    sudo chmod +x /usr/local/bin/migrate
    echo -e "${GREEN}✓${NC} migrate 工具安装完成"
else
    echo -e "${GREEN}✓${NC} migrate 工具已安装"
fi

#==============================================
# 步骤 4: 启动服务
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 4/4: 启动服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 停止现有服务
if docker ps | grep -q "dedata-"; then
    echo "停止现有服务..."
    docker compose down
fi

# 构建并启动服务
echo "构建并启动服务..."
docker compose up --build -d

# 等待数据库就绪
echo ""
echo "等待数据库启动..."
MAX_TRIES=30
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if docker exec dedata-postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 数据库已就绪"
        break
    fi
    TRIES=$((TRIES+1))
    if [ $TRIES -eq $MAX_TRIES ]; then
        echo -e "${RED}✗${NC} 数据库启动超时"
        docker compose logs postgres
        exit 1
    fi
    sleep 1
done

# 运行数据库迁移
echo ""
echo "运行数据库迁移..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?sslmode=disable"

if [ -d "./migrations" ]; then
    migrate -path ./migrations -database "$DATABASE_URL" up
    echo -e "${GREEN}✓${NC} 数据库迁移完成"
else
    echo -e "${YELLOW}⚠${NC} 未找到 migrations 目录，跳过迁移"
fi

# 等待应用启动
echo ""
echo "等待应用启动..."
sleep 5

#==============================================
# 验证部署
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}验证部署${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查容器状态
echo "检查容器状态..."
POSTGRES_STATUS=$(docker inspect -f '{{.State.Status}}' dedata-postgres 2>/dev/null || echo "not found")
REDIS_STATUS=$(docker inspect -f '{{.State.Status}}' dedata-redis 2>/dev/null || echo "not found")
APP_STATUS=$(docker inspect -f '{{.State.Status}}' dedata-app 2>/dev/null || echo "not found")

if [ "$POSTGRES_STATUS" = "running" ]; then
    echo -e "${GREEN}✓${NC} PostgreSQL 运行正常"
else
    echo -e "${RED}✗${NC} PostgreSQL 状态: $POSTGRES_STATUS"
    docker compose logs postgres | tail -20
fi

if [ "$REDIS_STATUS" = "running" ]; then
    echo -e "${GREEN}✓${NC} Redis 运行正常"
else
    echo -e "${RED}✗${NC} Redis 状态: $REDIS_STATUS"
    docker compose logs redis | tail -20
fi

if [ "$APP_STATUS" = "running" ]; then
    echo -e "${GREEN}✓${NC} 应用服务运行正常"
else
    echo -e "${RED}✗${NC} 应用服务状态: $APP_STATUS"
    echo ""
    echo "查看应用日志："
    docker compose logs app | tail -30
fi

# 测试健康检查
echo ""
echo "测试健康检查接口..."
sleep 3
if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 健康检查通过"
else
    echo -e "${YELLOW}⚠${NC} 健康检查失败（应用可能还在启动中）"
fi

#==============================================
# 部署完成
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 部署完成！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "📊 服务状态："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps
echo ""

echo "📝 常用命令："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  查看日志:       docker compose logs -f"
echo "  查看应用日志:   docker compose logs -f app"
echo "  重启服务:       docker compose restart"
echo "  停止服务:       docker compose down"
echo "  查看状态:       docker compose ps"
echo ""
echo "  健康检查:       curl http://localhost:8080/api/health"
echo "  进入数据库:     docker exec -it dedata-postgres psql -U $DB_USER -d $DB_NAME"
echo ""
echo -e "${GREEN}部署成功！🎉${NC}"
echo ""
