package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/dedata/dedata-backend/config"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var RDB *redis.Client

// Connect 连接 Redis
func Connect(cfg *config.RedisConfig, log *zap.Logger) error {
	ctx := context.Background()

	// 创建 Redis 客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.GetRedisAddr(),
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: cfg.PoolSize,
	})

	// 测试连接
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect redis: %w", err)
	}

	RDB = rdb
	log.Info("Redis connected successfully",
		zap.String("addr", cfg.GetRedisAddr()),
		zap.Int("db", cfg.DB),
		zap.Int("pool_size", cfg.PoolSize),
	)

	return nil
}

// Close 关闭 Redis 连接
func Close() error {
	if RDB != nil {
		return RDB.Close()
	}
	return nil
}

// GetRedis 获取 Redis 实例
func GetRedis() *redis.Client {
	return RDB
}
