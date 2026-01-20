#!/bin/bash
# DeData Backend - 生产环境快速部署脚本

set -e

echo "======================================"
echo "DeData Backend - Production Deployment"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}错误: 此脚本需要 root 权限运行${NC}"
   echo "请使用: sudo $0"
   exit 1
fi

# 检查环境变量文件
ENV_FILE="/etc/dedata/production.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 环境变量文件不存在: $ENV_FILE${NC}"
    echo ""
    echo "请先创建环境变量文件："
    echo "  sudo mkdir -p /etc/dedata"
    echo "  sudo nano /etc/dedata/production.env"
    echo ""
    echo "参考 DEPLOYMENT.md 文档中的环境变量配置部分"
    exit 1
fi

# 加载环境变量
set -a
source $ENV_FILE
set +a

echo -e "${GREEN}✓${NC} 环境变量文件加载成功"

# 1. 检查必需变量
echo ""
echo "检查必需环境变量..."
REQUIRED_VARS=(
    "DB_HOST" "DB_PORT" "DB_USER" "DB_PASSWORD" "DB_NAME"
    "REDIS_HOST" "REDIS_PORT"
    "JWT_SECRET"
    "BLOCKCHAIN_RPC_URL" "BLOCKCHAIN_PRIVATE_KEY" "BLOCKCHAIN_TOKEN_ADDRESS"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}✗${NC} 缺少环境变量: $var"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC} 所有必需环境变量已设置"

# 2. 测试数据库连接
echo ""
echo "测试数据库连接..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 数据库连接成功"
else
    echo -e "${RED}✗${NC} 数据库连接失败"
    echo "请检查数据库配置和网络连接"
    exit 1
fi

# 3. 运行数据库迁移
echo ""
echo "运行数据库迁移..."
if command -v migrate &> /dev/null; then
    cd $(dirname "$0")
    if [ -d "./migrations" ]; then
        migrate -path ./migrations -database "$DATABASE_URL" up
        echo -e "${GREEN}✓${NC} 数据库迁移完成"
    else
        echo -e "${YELLOW}⚠${NC} 未找到 migrations 目录，跳过迁移"
    fi
else
    echo -e "${YELLOW}⚠${NC} migrate 工具未安装，跳过数据库迁移"
    echo "安装方法: curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz && sudo mv migrate /usr/local/bin/"
fi

# 4. 编译应用
echo ""
echo "编译应用..."
cd $(dirname "$0")
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o dedata-backend ./cmd/api
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 应用编译成功"
else
    echo -e "${RED}✗${NC} 应用编译失败"
    exit 1
fi

# 5. 创建部署目录
echo ""
echo "创建部署目录..."
mkdir -p /opt/dedata/config
mkdir -p /var/log/dedata

# 6. 复制文件
echo "复制文件到部署目录..."
cp dedata-backend /opt/dedata/
cp config/config.production.yaml /opt/dedata/config/
chmod +x /opt/dedata/dedata-backend

echo -e "${GREEN}✓${NC} 文件复制完成"

# 7. 创建专用用户（如果不存在）
echo ""
if id "dedata" &>/dev/null; then
    echo -e "${GREEN}✓${NC} 用户 dedata 已存在"
else
    echo "创建专用用户..."
    useradd -r -s /bin/false dedata
    echo -e "${GREEN}✓${NC} 用户 dedata 创建成功"
fi

# 8. 设置权限
echo ""
echo "设置文件权限..."
chown -R dedata:dedata /opt/dedata
chown -R dedata:dedata /var/log/dedata
echo -e "${GREEN}✓${NC} 权限设置完成"

# 9. 创建 systemd 服务
echo ""
echo "创建 systemd 服务..."
cat > /etc/systemd/system/dedata.service <<EOF
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
EOF

echo -e "${GREEN}✓${NC} Systemd 服务创建完成"

# 10. 启动服务
echo ""
echo "启动服务..."
systemctl daemon-reload
systemctl enable dedata
systemctl restart dedata

# 等待服务启动
sleep 3

# 11. 检查服务状态
echo ""
echo "检查服务状态..."
if systemctl is-active --quiet dedata; then
    echo -e "${GREEN}✓${NC} 服务运行正常"

    # 测试健康检查
    echo ""
    echo "测试健康检查接口..."
    sleep 2
    if curl -s -f http://localhost:8080/api/health > /dev/null; then
        echo -e "${GREEN}✓${NC} 健康检查通过"
    else
        echo -e "${YELLOW}⚠${NC} 健康检查失败，服务可能还在启动中"
        echo "查看日志: sudo journalctl -u dedata -f"
    fi
else
    echo -e "${RED}✗${NC} 服务启动失败"
    echo ""
    echo "查看错误日志:"
    journalctl -u dedata -n 50 --no-pager
    exit 1
fi

# 12. 显示部署信息
echo ""
echo "======================================"
echo -e "${GREEN}部署完成！${NC}"
echo "======================================"
echo ""
echo "服务信息:"
echo "  状态: $(systemctl is-active dedata)"
echo "  日志: sudo journalctl -u dedata -f"
echo "  配置: /opt/dedata/config/config.production.yaml"
echo "  环境变量: /etc/dedata/production.env"
echo ""
echo "有用的命令:"
echo "  启动服务:   sudo systemctl start dedata"
echo "  停止服务:   sudo systemctl stop dedata"
echo "  重启服务:   sudo systemctl restart dedata"
echo "  查看状态:   sudo systemctl status dedata"
echo "  查看日志:   sudo journalctl -u dedata -f"
echo "  应用日志:   sudo tail -f /var/log/dedata/app.log"
echo "  错误日志:   sudo tail -f /var/log/dedata/error.log"
echo ""
echo "健康检查: curl http://localhost:8080/api/health"
echo ""
echo "下一步:"
echo "  1. 配置 Nginx 反向代理（参考 DEPLOYMENT.md）"
echo "  2. 设置 SSL 证书"
echo "  3. 配置数据库备份（参考 DEPLOYMENT.md）"
echo "  4. 设置监控告警"
echo ""
echo "如有问题，请查看 DEPLOYMENT.md 文档"
