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

# 安装 ca-certificates（HTTPS 请求需要）
RUN apk --no-cache add ca-certificates wget

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /build/dedata-backend .

# 复制配置文件
COPY config ./config

# 暴露端口
EXPOSE 8080

# 运行应用
CMD ["./dedata-backend"]
