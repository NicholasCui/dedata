# GitHub Secrets 配置指南

本文档说明如何配置 GitHub Secrets 以实现自动部署。

## 必需的 GitHub Secrets

前往你的 GitHub 仓库：`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

### 1. DEPLOY_HOST
- **说明**: 服务器 IP 地址或域名
- **示例**: `123.45.67.89` 或 `server.example.com`

### 2. DEPLOY_USER
- **说明**: SSH 登录用户名
- **示例**: `root` 或 `ubuntu` 或 `deploy`

### 3. DEPLOY_KEY
- **说明**: SSH 私钥（用于免密登录）
- **如何生成**:

```bash
# 1. 在本地生成 SSH 密钥对
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# 2. 将公钥复制到服务器
ssh-copy-id -i ~/.ssh/deploy_key.pub your-user@your-server

# 或手动添加到服务器的 ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key.pub  # 复制输出内容
# 然后在服务器上：echo "粘贴的公钥内容" >> ~/.ssh/authorized_keys

# 3. 测试 SSH 连接
ssh -i ~/.ssh/deploy_key your-user@your-server

# 4. 复制私钥内容到 GitHub Secret
cat ~/.ssh/deploy_key
# 将整个输出（包括 -----BEGIN 和 -----END 行）复制到 DEPLOY_KEY Secret
```

### 4. DEPLOY_ENV
- **说明**: 完整的 .env 文件内容，包含所有环境变量和密码
- **格式**: 多行文本，每行一个环境变量

**示例内容**:
```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your-super-secure-db-password-min-32-chars
DB_NAME=dedata

# Redis Configuration
REDIS_PASSWORD=your-super-secure-redis-password-min-32-chars

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-must-be-very-long-and-random-min-32-characters

# Session Configuration
SESSION_SECRET=your-session-secret-key-must-be-very-long-and-random-min-32-chars

# Environment
ENV=production

# API Configuration (使用服务器的实际域名或 IP)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# GitHub Container Registry (用于拉取镜像)
GITHUB_REPOSITORY=yourusername/yourrepo
```

**如何生成强密码**:
```bash
# 生成 32 字符的随机密码
openssl rand -base64 32

# 生成 64 字符的随机密码
openssl rand -base64 64
```

## 可选的 GitHub Secrets

### 5. DEPLOY_PORT (可选)
- **说明**: SSH 端口
- **默认值**: 22
- **示例**: 如果你的服务器 SSH 使用自定义端口（如 2222），则设置此值

### 6. DEPLOY_PATH (可选)
- **说明**: 服务器上项目的部署路径
- **默认值**: `/opt/dedata`
- **示例**: `/home/deploy/dedata` 或 `/var/www/dedata`

## 服务器准备工作

在服务器上执行以下操作：

### 1. 安装 Docker 和 Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 2. 创建项目目录

```bash
# 创建部署目录（与 DEPLOY_PATH 一致）
sudo mkdir -p /opt/dedata
sudo chown $USER:$USER /opt/dedata
cd /opt/dedata
```

### 3. 创建 docker-compose.yml

```bash
# 将项目的 docker-compose.yml 复制到服务器
# 方法1: 使用 scp
scp docker-compose.yml your-user@your-server:/opt/dedata/

# 方法2: 克隆仓库
cd /opt/dedata
git clone https://github.com/yourusername/yourrepo.git .
```

### 4. 配置防火墙

```bash
# Ubuntu/Debian (使用 ufw)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Frontend (如果需要直接访问)
sudo ufw allow 8080/tcp    # Backend (如果需要直接访问)
sudo ufw enable

# CentOS/RHEL (使用 firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## 验证配置

### 1. 测试 SSH 连接

```bash
ssh -i ~/.ssh/deploy_key your-user@your-server
```

### 2. 在服务器上测试 Docker

```bash
docker ps
docker-compose version
```

### 3. 触发部署

推送代码到 main 分支：

```bash
git add .
git commit -m "trigger deployment"
git push origin main
```

### 4. 查看部署日志

在 GitHub 仓库中：
1. 点击 `Actions` 标签
2. 选择最新的 workflow run
3. 查看 "Deploy to server via SSH" 步骤的日志

### 5. 验证服务器上的部署

```bash
# SSH 到服务器
ssh your-user@your-server

# 查看运行的容器
cd /opt/dedata
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查健康状态
curl http://localhost:8080/api/health
curl http://localhost:3000
```

## 安全最佳实践

1. **使用强密码**
   - 所有密码至少 32 字符
   - 使用随机生成器，不要手动创建

2. **限制 SSH 访问**
   ```bash
   # 只允许密钥登录
   sudo nano /etc/ssh/sshd_config
   # 设置: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

3. **使用 HTTPS**
   - 配置反向代理（Nginx/Caddy）
   - 使用 Let's Encrypt 免费 SSL 证书

4. **定期更新**
   ```bash
   # 服务器系统更新
   sudo apt update && sudo apt upgrade -y

   # Docker 镜像更新（自动通过 CI/CD）
   ```

5. **监控和日志**
   - 配置日志轮转
   - 设置监控告警

6. **备份**
   ```bash
   # 定期备份数据库
   docker-compose exec postgres pg_dump -U postgres dedata > backup_$(date +%Y%m%d).sql
   ```

## 故障排除

### 部署失败

1. 检查 GitHub Actions 日志
2. 确认所有 Secrets 都已正确设置
3. 确认服务器 SSH 连接正常
4. 确认服务器有足够的磁盘空间

```bash
# 检查磁盘空间
df -h

# 清理 Docker 资源
docker system prune -af
```

### 容器启动失败

```bash
# 查看容器日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis

# 检查 .env 文件
cat /opt/dedata/.env

# 重启服务
docker-compose restart
```

### 无法拉取镜像

确保服务器可以访问 GitHub Container Registry：

```bash
# 测试连接
curl -I https://ghcr.io

# 手动登录测试
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u your-username --password-stdin
```

## 回滚部署

如果需要回滚到之前的版本：

```bash
# SSH 到服务器
ssh your-user@your-server
cd /opt/dedata

# 停止当前版本
docker-compose down

# 拉取特定版本的镜像（使用 commit SHA 或 tag）
docker pull ghcr.io/yourusername/yourrepo/backend:sha-abc123
docker pull ghcr.io/yourusername/yourrepo/frontend:sha-abc123

# 更新 docker-compose.yml 使用特定版本
# 或设置环境变量
export IMAGE_TAG=sha-abc123
docker-compose up -d
```

## 支持

如有问题，请：
1. 检查 GitHub Actions 日志
2. 检查服务器日志
3. 查阅 DOCKER_DEPLOYMENT.md
4. 提交 GitHub Issue
