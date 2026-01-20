#!/bin/bash

# 数据库状态检查脚本
# 用于诊断生产环境数据库初始化问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo ""
print_info "=========================================="
print_info "  数据库状态诊断"
print_info "=========================================="
echo ""

# 1. 检查环境变量
print_info "1. 检查环境变量配置"
echo ""
if [ -f ".env.production" ]; then
    print_success "找到 .env.production"
    echo ""
    echo "DATABASE_URL:"
    grep "DATABASE_URL" .env.production | sed 's/:[^:]*@/:***@/'
    echo ""
else
    print_error "未找到 .env.production"
    exit 1
fi

# 2. 检查迁移状态
print_info "2. 检查 Prisma 迁移状态"
echo ""
npx dotenv -e .env.production -- npx prisma migrate status
echo ""

# 3. 检查数据库表结构
print_info "3. 检查数据库 User 表结构"
echo ""
echo "请运行以下命令手动检查 User 表结构："
echo ""
echo "方式1 - 使用 Docker:"
echo "docker exec -it dedata-postgres psql -U dedata_prod -d dedata_production -c \"\\d+ \\\"User\\\"\""
echo ""
echo "方式2 - 如果安装了 psql:"
echo "PGPASSWORD='aljfalkWLJI.da080384091Wa.ww' psql -h localhost -p 5433 -U dedata_prod -d dedata_production -c \"\\d+ \\\"User\\\"\""
echo ""

# 4. 检查 Prisma Client
print_info "4. 检查 Prisma Client 生成状态"
echo ""
if [ -d "node_modules/@prisma/client" ]; then
    print_success "Prisma Client 已安装"
    CLIENT_VERSION=$(node -e "console.log(require('./node_modules/@prisma/client/package.json').version)")
    echo "版本: $CLIENT_VERSION"
    echo ""

    if [ -d "node_modules/.prisma/client" ]; then
        print_success "生成的 Prisma Client 存在"
        echo "生成时间:"
        ls -lh node_modules/.prisma/client/index.js | awk '{print $6, $7, $8}'
        echo ""

        # 检查 schema.prisma 的修改时间
        echo "Schema 文件修改时间:"
        ls -lh prisma/schema.prisma | awk '{print $6, $7, $8}'
        echo ""
    else
        print_warning "生成的 Prisma Client 不存在"
        echo ""
    fi
else
    print_error "Prisma Client 未安装"
    echo ""
fi

# 5. 检查构建状态
print_info "5. 检查 Next.js 构建状态"
echo ""
if [ -d ".next" ]; then
    print_success "Next.js 构建存在"
    echo "构建时间:"
    ls -lh .next/BUILD_ID | awk '{print $6, $7, $8}'
    echo "BUILD_ID: $(cat .next/BUILD_ID)"
    echo ""
else
    print_warning "Next.js 构建不存在"
    echo ""
fi

# 6. 检查迁移文件
print_info "6. 检查迁移文件"
echo ""
echo "迁移文件列表:"
ls -lh prisma/migrations/
echo ""

# 7. 生成诊断报告
print_info "=========================================="
print_info "  诊断建议"
print_info "=========================================="
echo ""

print_info "如果发现问题，按以下顺序修复："
echo ""
echo "1. 确保迁移已应用:"
echo "   npm run db:migrate:prod"
echo ""
echo "2. 验证数据库表结构 (运行上面的 psql 命令)"
echo ""
echo "3. 重新生成 Prisma Client:"
echo "   npx prisma generate"
echo ""
echo "4. 清除并重建应用:"
echo "   rm -rf .next && npm run build"
echo ""
echo "5. 重启应用:"
echo "   pm2 restart dedata-app"
echo ""
