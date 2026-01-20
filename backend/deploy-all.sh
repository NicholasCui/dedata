#!/bin/bash
# DeData Backend - 完整部署脚本（从零到运行）
# 包含：数据库启动 -> 配置 -> 迁移 -> 编译 -> 部署 -> 验证

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}错误: 此脚本需要 root 权限运行${NC}"
   echo "请使用: sudo $0"
   exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

clear
echo "======================================"
echo -e "${CYAN}DeData Backend - 完整部署向导${NC}"
echo "======================================"
echo ""
echo "此脚本将完成以下操作："
echo "  1. 启动数据库容器（PostgreSQL + Redis）"
echo "  2. 配置环境变量"
echo "  3. 运行数据库迁移"
echo "  4. 编译应用程序"
echo "  5. 部署并启动服务"
echo "  6. 验证部署状态"
echo ""
read -p "按 Enter 继续，或 Ctrl+C 取消..."

#==============================================
# 步骤 1: 启动数据库容器
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 1/6: 启动数据库容器${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose 未安装或版本过低"
    echo "请先安装 Docker Compose v2: https://docs.docker.com/compose/install/"
    echo "或更新 Docker 到最新版本"
    exit 1
fi

# 检查是否已有容器运行
if docker ps | grep -q "dedata-postgres"; then
    echo -e "${YELLOW}⚠${NC} 数据库容器已在运行"
    read -p "是否重启数据库容器? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "停止现有容器..."
        docker compose -f docker-compose.db.yml down
        echo "启动数据库容器..."
        docker compose -f docker-compose.db.yml up -d
    fi
else
    echo "启动数据库容器..."
    docker compose -f docker-compose.db.yml up -d
fi

echo "等待数据库启动..."
sleep 5

# 验证数据库
MAX_TRIES=10
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if docker exec dedata-postgres pg_isready -U dedata_admin -d dedata_prod > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL 运行正常"
        break
    fi
    TRIES=$((TRIES+1))
    if [ $TRIES -eq $MAX_TRIES ]; then
        echo -e "${RED}✗${NC} PostgreSQL 启动失败"
        docker compose -f docker-compose.db.yml logs postgres
        exit 1
    fi
    sleep 2
done

# 验证 Redis
# 获取实际使用的密码（从容器配置中）
ACTUAL_REDIS_PASSWORD=$(docker inspect dedata-redis --format '{{range .Args}}{{.}} {{end}}' | grep -oP '(?<=--requirepass )\S+')
echo "等待 Redis 完全启动..."
sleep 3

MAX_REDIS_TRIES=10
REDIS_TRIES=0
while [ $REDIS_TRIES -lt $MAX_REDIS_TRIES ]; do
    if docker exec dedata-redis redis-cli -a "$ACTUAL_REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
        echo -e "${GREEN}✓${NC} Redis 运行正常"
        break
    fi
    REDIS_TRIES=$((REDIS_TRIES+1))
    if [ $REDIS_TRIES -eq $MAX_REDIS_TRIES ]; then
        echo -e "${RED}✗${NC} Redis 启动失败"
        echo "尝试查看 Redis 日志："
        docker logs dedata-redis --tail 20
        exit 1
    fi
    sleep 2
done

#==============================================
# 步骤 2: 配置环境变量
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 2/6: 配置环境变量${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 使用项目根目录的 .env 文件
ENV_FILE="$SCRIPT_DIR/.env"

# 检查是否已存在 .env 文件
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓${NC} 找到环境变量文件: $ENV_FILE"
    
    # 加载环境变量并验证
    set -a
    source "$ENV_FILE"
    set +a
    
    echo -e "${GREEN}✓${NC} 环境变量加载完成"
else
    echo -e "${YELLOW}⚠${NC} 未找到 .env 文件"
    
    # 检查是否有 .env.example
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        echo ""
        echo "发现 .env.example 文件"
        read -p "是否从 .env.example 创建 .env 文件? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
            echo -e "${GREEN}✓${NC} 已创建 .env 文件"
            echo ""
            echo -e "${RED}⚠ 重要: 请编辑 .env 文件，配置以下必需项：${NC}"
            echo "  1. DB_PASSWORD - 数据库密码"
            echo "  2. REDIS_PASSWORD - Redis 密码"  
            echo "  3. JWT_SECRET - JWT 密钥 (建议: openssl rand -base64 32)"
            echo "  4. BLOCKCHAIN_PRIVATE_KEY - 区块链私钥"
            echo "  5. X402_API_TOKEN - x402 API token"
            echo "  6. X402_MERCHANT_ID - x402 商户 ID"
            echo ""
            echo "编辑命令: nano $ENV_FILE"
            echo ""
            read -p "按 Enter 打开编辑器..." 
            ${EDITOR:-nano} "$ENV_FILE"
            
            # 编辑完成后加载
            set -a
            source "$ENV_FILE"
            set +a
        else
            echo -e "${RED}✗ 错误: 无法继续部署，需要 .env 文件${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ 错误: 未找到 .env.example 文件${NC}"
        echo "请确保在项目根目录运行此脚本"
        exit 1
    fi
fi

# 验证必需的环境变量
echo ""
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

# 构建数据库连接 URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# 测试数据库连接
echo ""
echo "测试数据库连接..."
if docker exec dedata-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 数据库连接成功"
else
    echo -e "${RED}✗${NC} 数据库连接失败"
    echo "请检查数据库配置和容器状态"
    exit 1
fi


#==============================================
# 步骤 3: 运行数据库迁移
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 3/6: 运行数据库迁移${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查 migrate 工具
if ! command -v migrate &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} migrate 工具未安装，正在安装..."
    curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
    mv migrate /usr/local/bin/
    chmod +x /usr/local/bin/migrate
    echo -e "${GREEN}✓${NC} migrate 工具安装完成"
fi

# 运行迁移
if [ -d "./migrations" ]; then
    echo "运行数据库迁移..."
    migrate -path ./migrations -database "$DATABASE_URL" up
    echo -e "${GREEN}✓${NC} 数据库迁移完成"

    # 显示当前迁移版本
    MIGRATION_VERSION=$(migrate -path ./migrations -database "$DATABASE_URL" version 2>&1 | tail -1)
    echo "当前迁移版本: $MIGRATION_VERSION"

    # 验证表是否创建
    echo ""
    echo "数据库表结构："
    psql "$DATABASE_URL" -c "\dt" | grep -E "users|profiles|login_challenges|check_ins" || true
else
    echo -e "${YELLOW}⚠${NC} 未找到 migrations 目录"
fi

#==============================================
# 步骤 4: 编译应用
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 4/6: 编译应用程序${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查 Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}✗${NC} Go 未安装"
    echo "请先安装 Go: https://golang.org/dl/"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}')
echo "Go 版本: $GO_VERSION"

echo "编译应用..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o dedata-backend ./cmd/api

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 应用编译成功"
    FILE_SIZE=$(ls -lh dedata-backend | awk '{print $5}')
    echo "可执行文件大小: $FILE_SIZE"
else
    echo -e "${RED}✗${NC} 应用编译失败"
    exit 1
fi

#==============================================
# 步骤 5: 部署并启动服务
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 5/6: 部署并启动服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 创建部署目录
echo "创建部署目录..."
mkdir -p /opt/dedata/config
mkdir -p /var/log/dedata

# 复制文件
echo "复制文件到部署目录..."
cp dedata-backend /opt/dedata/
cp config/config.production.yaml /opt/dedata/config/
cp "$ENV_FILE" /opt/dedata/.env
chmod +x /opt/dedata/dedata-backend
chmod 600 /opt/dedata/.env

# 创建专用用户
if id "dedata" &>/dev/null; then
    echo -e "${GREEN}✓${NC} 用户 dedata 已存在"
else
    echo "创建专用用户..."
    useradd -r -s /bin/false dedata
    echo -e "${GREEN}✓${NC} 用户 dedata 创建成功"
fi

# 设置权限
chown -R dedata:dedata /opt/dedata
chown -R dedata:dedata /var/log/dedata

# 创建 systemd 服务
echo "创建 systemd 服务..."
cat > /etc/systemd/system/dedata.service <<EOF
[Unit]
Description=DeData Backend Service
After=network.target
Wants=docker.service

[Service]
Type=simple
User=dedata
Group=dedata
WorkingDirectory=/opt/dedata
EnvironmentFile=/opt/dedata/.env
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
EOF

echo -e "${GREEN}✓${NC} Systemd 服务创建完成"

# 重新加载 systemd
systemctl daemon-reload

# 启动服务
echo "启动服务..."
systemctl enable dedata
systemctl restart dedata

# 等待服务启动
echo "等待服务启动..."
sleep 3

#==============================================
# 步骤 6: 验证部署
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}步骤 6/6: 验证部署状态${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查服务状态
echo "检查服务状态..."
if systemctl is-active --quiet dedata; then
    echo -e "${GREEN}✓${NC} 服务运行正常"

    # 检查健康接口
    sleep 2
    echo ""
    echo "测试健康检查接口..."
    HEALTH_CHECK=$(curl -s -f http://localhost:8080/api/health 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} 健康检查通过"
        echo "响应: $HEALTH_CHECK"
    else
        echo -e "${YELLOW}⚠${NC} 健康检查失败（服务可能还在启动中）"
        echo "查看日志: sudo journalctl -u dedata -n 50"
    fi
else
    echo -e "${RED}✗${NC} 服务启动失败"
    echo ""
    echo "错误日志："
    journalctl -u dedata -n 50 --no-pager
    exit 1
fi

# 显示服务状态
echo ""
systemctl status dedata --no-pager -l | head -20

#==============================================
# 部署完成
#==============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 部署完成！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 显示部署信息
echo "📊 部署信息："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🗄️  数据库："
echo "  PostgreSQL: localhost:5432 (容器: dedata-postgres)"
echo "  Redis: localhost:6379 (容器: dedata-redis)"
echo "  数据库名: dedata_prod"
echo ""
echo "🚀 应用服务："
echo "  状态: $(systemctl is-active dedata)"
echo "  端口: 8080"
echo "  配置: /opt/dedata/config/config.production.yaml"
echo "  环境变量: /opt/dedata/.env"
echo ""
echo "📝 日志文件："
echo "  应用日志: /var/log/dedata/app.log"
echo "  错误日志: /var/log/dedata/error.log"
echo "  系统日志: sudo journalctl -u dedata -f"
echo ""
echo "🔗 API 接口："
echo "  健康检查: http://localhost:8080/api/health"
echo "  API 文档: http://localhost:8080/api/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 常用命令："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "服务管理："
echo "  启动服务:   sudo systemctl start dedata"
echo "  停止服务:   sudo systemctl stop dedata"
echo "  重启服务:   sudo systemctl restart dedata"
echo "  查看状态:   sudo systemctl status dedata"
echo ""
echo "日志查看："
echo "  实时日志:   sudo journalctl -u dedata -f"
echo "  应用日志:   sudo tail -f /var/log/dedata/app.log"
echo "  错误日志:   sudo tail -f /var/log/dedata/error.log"
echo ""
echo "数据库管理："
echo "  连接数据库: docker exec -it dedata-postgres psql -U dedata_admin -d dedata_prod"
echo "  查看容器:   docker ps | grep dedata"
echo "  停止数据库: docker compose -f docker-compose.db.yml down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 下一步建议："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. 测试 API 接口: curl http://localhost:8080/api/health"
echo "  2. 配置 Nginx 反向代理（可选）"
echo "  3. 设置 SSL 证书（生产环境必需）"
echo "  4. 配置数据库备份"
echo "  5. 设置监控告警"
echo ""
echo "📖 详细文档: README.md, DEPLOYMENT.md, QUICKSTART.md"
echo ""
echo -e "${GREEN}部署成功！祝使用愉快！🎉${NC}"
echo ""
