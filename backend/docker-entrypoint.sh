#!/bin/sh
set -e

echo "Starting entrypoint script..."

# 构建数据库连接字符串
DB_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DBNAME}?sslmode=${DATABASE_SSLMODE:-disable}"

echo "Running database migrations..."
migrate -path /app/migrations -database "$DB_URL" up

echo "Migrations completed. Starting application..."
exec ./dedata-backend
