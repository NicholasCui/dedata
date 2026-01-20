#!/bin/bash
# DeData Backend - Docker 清理脚本
# 用于清理所有 Docker 容器、卷和网络

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo "======================================"
echo -e "${CYAN}DeData Backend - Docker 清理工具${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}警告: 此操作将删除所有 DeData 相关的 Docker 资源${NC}"
echo ""
echo "将执行以下操作："
echo "  1. 停止所有服务（docker compose down）"
echo "  2. 删除所有容器"
echo "  3. 删除所有数据卷（包括数据库数据）"
echo "  4. 删除 Docker 网络"
echo "  5. (可选) 删除 Docker 镜像"
echo ""
read -p "确认继续? (yes/NO) " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "操作已取消"
    exit 0
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 1: 停止服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 使用 docker compose down 停止所有服务
if [ -f "docker-compose.yml" ]; then
    echo "使用 docker-compose.yml 停止服务..."
    docker compose down
    echo -e "${GREEN}✓${NC} 服务已停止"
elif [ -f "docker-compose.db.yml" ]; then
    echo "使用 docker-compose.db.yml 停止服务..."
    docker compose -f docker-compose.db.yml down
    echo -e "${GREEN}✓${NC} 服务已停止"
else
    echo -e "${YELLOW}⚠${NC} 未找到 docker-compose 文件，尝试手动停止..."
    CONTAINERS=$(docker ps -a --filter "name=dedata" --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$CONTAINERS" ]; then
        docker stop $CONTAINERS 2>/dev/null || true
        echo -e "${GREEN}✓${NC} 容器已停止"
    else
        echo -e "${GREEN}✓${NC} 没有运行中的容器"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 2: 删除容器${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CONTAINERS=$(docker ps -a --filter "name=dedata" --format "{{.Names}}" 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
    echo "删除容器: $CONTAINERS"
    docker rm -f $CONTAINERS 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 容器已删除"
else
    echo -e "${GREEN}✓${NC} 没有需要删除的容器"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 3: 删除数据卷${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 查找 DeData 相关的数据卷
VOLUMES=$(docker volume ls --filter "name=dedata" --format "{{.Name}}" 2>/dev/null || true)
if [ -z "$VOLUMES" ]; then
    # 尝试查找项目目录名称相关的卷
    PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -d '-_')
    VOLUMES=$(docker volume ls --filter "name=${PROJECT_NAME}" --format "{{.Name}}" 2>/dev/null || true)
fi

if [ -n "$VOLUMES" ]; then
    echo "找到以下数据卷："
    echo "$VOLUMES"
    echo ""
    echo -e "${YELLOW}⚠ 这将删除所有数据库数据！${NC}"
    read -p "确认删除数据卷? (yes/NO) " -r
    if [[ $REPLY == "yes" ]]; then
        docker volume rm $VOLUMES 2>/dev/null || true
        echo -e "${GREEN}✓${NC} 数据卷已删除"
    else
        echo -e "${YELLOW}⊘${NC} 已跳过数据卷删除"
    fi
else
    echo -e "${GREEN}✓${NC} 没有需要删除的数据卷"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 4: 删除网络${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 查找 DeData 相关的网络
NETWORKS=$(docker network ls --filter "name=dedata" --format "{{.Name}}" | grep -v "bridge\|host\|none" 2>/dev/null || true)
if [ -z "$NETWORKS" ]; then
    PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -d '-_')
    NETWORKS=$(docker network ls --filter "name=${PROJECT_NAME}" --format "{{.Name}}" | grep -v "bridge\|host\|none" 2>/dev/null || true)
fi

if [ -n "$NETWORKS" ]; then
    echo "删除网络: $NETWORKS"
    docker network rm $NETWORKS 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 网络已删除"
else
    echo -e "${GREEN}✓${NC} 没有需要删除的网络"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 5: 删除镜像（可选）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "是否删除 PostgreSQL 和 Redis 镜像？"
echo "  postgres:14-alpine"
echo "  redis:7-alpine"
echo ""
read -p "删除镜像? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "删除镜像..."
    docker rmi postgres:14-alpine 2>/dev/null || echo "postgres:14-alpine 镜像不存在或无法删除"
    docker rmi redis:7-alpine 2>/dev/null || echo "redis:7-alpine 镜像不存在或无法删除"
    echo -e "${GREEN}✓${NC} 镜像删除完成"
else
    echo -e "${YELLOW}⊘${NC} 已跳过镜像删除"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 清理完成！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 显示清理结果
echo "📊 清理结果："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REMAINING_CONTAINERS=$(docker ps -a --filter "name=dedata" --format "{{.Names}}" 2>/dev/null || true)
if [ -z "$REMAINING_CONTAINERS" ]; then
    echo -e "${GREEN}✓${NC} 容器: 已全部清理"
else
    echo -e "${YELLOW}⚠${NC} 容器: 仍有残留"
    echo "  $REMAINING_CONTAINERS"
fi

REMAINING_VOLUMES=$(docker volume ls --filter "name=dedata" --format "{{.Name}}" 2>/dev/null || true)
if [ -z "$REMAINING_VOLUMES" ]; then
    echo -e "${GREEN}✓${NC} 数据卷: 已全部清理"
else
    echo -e "${YELLOW}⚠${NC} 数据卷: 仍有残留"
    echo "  $REMAINING_VOLUMES"
fi

echo ""
echo "下一步："
echo "  重新部署: ./deploy-simple.sh"
echo "  或启动服务: docker compose up -d"
echo ""
