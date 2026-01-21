# 多阶段构建 Dockerfile
FROM golang:1.24-alpine AS builder

# 安装必要的工具
RUN apk add --no-cache git make gcc musl-dev

WORKDIR /build

# 复制 go mod 文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 编译应用（使用 GOTOOLCHAIN=auto 自动下载 go1.24）
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o dedata-backend ./cmd/api

# 运行阶段
FROM alpine:latest

# 安装 ca-certificates（HTTPS 请求需要）和 migrate 工具
RUN apk --no-cache add ca-certificates wget curl && \
    wget https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz && \
    tar xvf migrate.linux-amd64.tar.gz && \
    mv migrate /usr/local/bin/migrate && \
    chmod +x /usr/local/bin/migrate && \
    rm migrate.linux-amd64.tar.gz

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /build/dedata-backend .

# 复制配置文件和迁移文件
COPY config ./config
COPY migrations ./migrations

# 复制启动脚本
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# 暴露端口
EXPOSE 8080

# 使用启动脚本
CMD ["./docker-entrypoint.sh"]
