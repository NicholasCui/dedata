# DeData Docker Deployment Guide

This guide explains how to deploy the DeData application using Docker and GitHub Actions.

## Architecture

The application consists of 4 services:

- **Backend**: Go API server (port 8080)
- **Frontend**: Next.js application (port 3000)
- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache store (port 6379)

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Git installed

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and update the following values:

```env
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=dedata
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-jwt-secret-minimum-32-characters
SESSION_SECRET=your-session-secret-minimum-32-characters
ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Build and Run

Build and start all services:

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f
```

Stop all services:

```bash
docker-compose down
```

Stop and remove volumes (WARNING: This deletes all data):

```bash
docker-compose down -v
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Health Check: http://localhost:8080/api/health

## GitHub Actions CI/CD

The project includes a GitHub Actions workflow that automatically:

1. Builds Docker images for backend and frontend
2. Pushes images to GitHub Container Registry (ghcr.io)
3. Tags images appropriately based on branch/tag

### Setup GitHub Actions

The workflow is automatically triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Images are published to:
- `ghcr.io/<your-repo>/backend`
- `ghcr.io/<your-repo>/frontend`

### Using Published Images

Pull the latest images:

```bash
docker pull ghcr.io/<your-repo>/backend:latest
docker pull ghcr.io/<your-repo>/frontend:latest
```

Or update `docker-compose.yml` to use published images instead of building locally:

```yaml
services:
  backend:
    image: ghcr.io/<your-repo>/backend:latest
    # Remove the 'build' section

  frontend:
    image: ghcr.io/<your-repo>/frontend:latest
    # Remove the 'build' section
```

## Production Deployment

### Option 1: Docker Compose on a Server

1. SSH into your server
2. Clone the repository
3. Create `.env` file with production values
4. Run `docker-compose up -d`

### Option 2: Kubernetes

Convert docker-compose.yml to Kubernetes manifests using tools like:
- Kompose: `kompose convert`
- Manual creation of Deployment, Service, ConfigMap, and Secret resources

### Option 3: Cloud Platforms

Deploy to platforms like:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

## Database Migrations

If you need to run Prisma migrations:

```bash
# Access frontend container
docker-compose exec frontend sh

# Run migrations
npx prisma migrate deploy
```

## Backup and Restore

### Backup PostgreSQL

```bash
docker-compose exec postgres pg_dump -U postgres dedata > backup.sql
```

### Restore PostgreSQL

```bash
docker-compose exec -T postgres psql -U postgres dedata < backup.sql
```

### Backup Redis

```bash
docker-compose exec redis redis-cli --rdb /data/dump.rdb SAVE
docker cp dedata-redis:/data/dump.rdb ./redis-backup.rdb
```

## Troubleshooting

### Check service health

```bash
docker-compose ps
```

### View logs for specific service

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart a specific service

```bash
docker-compose restart backend
```

### Rebuild after code changes

```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

## Security Recommendations

1. **Change all default passwords** in `.env`
2. **Use strong secrets** (minimum 32 characters)
3. **Enable firewall** on production servers
4. **Use HTTPS** with a reverse proxy (nginx/traefik)
5. **Regular backups** of database and Redis
6. **Keep Docker images updated** regularly
7. **Limit exposed ports** in production
8. **Use Docker secrets** for sensitive data in production

## Monitoring

Consider adding monitoring tools:

- **Logs**: ELK Stack, Loki, or CloudWatch
- **Metrics**: Prometheus + Grafana
- **APM**: New Relic, Datadog, or Sentry
- **Health checks**: Built into docker-compose.yml

## Performance Tuning

### PostgreSQL

Add to `docker-compose.yml`:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
```

### Redis

Add to `docker-compose.yml`:

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Support

For issues or questions, please open an issue on GitHub.
