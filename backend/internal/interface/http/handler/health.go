package handler

import (
	"context"
	"time"

	"github.com/dedata/dedata-backend/internal/infrastructure/cache"
	"github.com/dedata/dedata-backend/internal/infrastructure/database"
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check health check endpoint
func (h *HealthHandler) Check(c *gin.Context) {
	data := gin.H{
		"status":  "ok",
		"service": "dedata-backend",
	}

	// Check database
	if db := database.GetDB(); db != nil {
		sqlDB, err := db.DB()
		if err == nil {
			if err := sqlDB.Ping(); err == nil {
				data["database"] = "connected"
			} else {
				data["database"] = "disconnected"
			}
		} else {
			data["database"] = "error"
		}
	} else {
		data["database"] = "not_initialized"
	}

	// Check Redis
	if rdb := cache.GetRedis(); rdb != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := rdb.Ping(ctx).Err(); err == nil {
			data["redis"] = "connected"
		} else {
			data["redis"] = "disconnected"
		}
	} else {
		data["redis"] = "not_initialized"
	}

	response.Success(c, data)
}
