package routes

import (
	"github.com/dedata/dedata-backend/internal/interface/http/handler"
	"github.com/gin-gonic/gin"
)

// RegisterHealthRoutes 注册健康检查路由
func RegisterHealthRoutes(r *gin.RouterGroup, healthHandler *handler.HealthHandler) {
	r.GET("/health", healthHandler.Check)
}
