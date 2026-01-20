# 路径修复总结

## 问题
GitHub Actions 构建时找不到 `./dedata-backend` 和 `./dedata-interface` 目录，因为实际的项目结构是：
- `backend/` (不是 `dedata-backend/`)
- `frontend/` (不是 `dedata-interface/`)

## 已修复的文件

### 1. `.github/workflows/deploy.yml`
- ✅ Backend context: `./dedata-backend` → `./backend`
- ✅ Backend dockerfile: `./dedata-backend/Dockerfile` → `./backend/Dockerfile`
- ✅ Frontend context: `./frontend` (已经正确)
- ✅ Frontend dockerfile: `./frontend/Dockerfile.new` → `./frontend/Dockerfile`
- ✅ Frontend .env.production 路径: `./dedata-interface/.env.production` → `./frontend/.env.production`

### 2. `docker-compose.yml`
- ✅ Backend build context: `./dedata-backend` → `./backend`
- ✅ Frontend build context 注释已更新为 `./frontend`
- ✅ Frontend dockerfile 注释已更新为 `Dockerfile`

### 3. Dockerfile 位置
- ✅ Backend: 使用现有的 `backend/Dockerfile`
- ✅ Frontend: 创建了新的 `frontend/Dockerfile`

## 验证

现在推送代码到 GitHub 应该能够成功构建：

```bash
git add .
git commit -m "fix: update paths for monorepo structure"
git push origin main
```

GitHub Actions 会自动：
1. ✅ 构建 backend 镜像（从 `./backend`）
2. ✅ 构建 frontend 镜像（从 `./frontend`）
3. ✅ 推送到 ghcr.io
4. ✅ 部署到服务器（如果配置了 Secrets）

## 下一步

确保在 GitHub Secrets 中配置（参考 `GITHUB_SECRETS.md`）：
- `DEPLOY_HOST` - 服务器地址
- `DEPLOY_USER` - SSH 用户
- `DEPLOY_KEY` - SSH 私钥
- `DEPLOY_ENV` - 环境变量文件内容
- `DEPLOY_PATH` - 部署路径（可选，默认 `/opt/dedata`）
- `DEPLOY_PORT` - SSH 端口（可选，默认 22）
