package routes

import (
	"github.com/dedata/dedata-backend/internal/interface/http/handler"
	"github.com/dedata/dedata-backend/internal/interface/http/middleware"
	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"github.com/gin-gonic/gin"
)

// RegisterCheckInRoutes 注册签到路由
func RegisterCheckInRoutes(r *gin.RouterGroup, h *handler.CheckInHandler, jwtMgr *pkgJWT.JWTManager) {
	checkin := r.Group("/checkin")
	checkin.Use(middleware.AuthMiddleware(jwtMgr)) // 所有签到路由都需要认证
	{
		checkin.POST("", h.CheckIn)                  // 发起签到
		checkin.POST("/verify", h.VerifyCheckIn)     // 验证签到支付
		checkin.GET("/my", h.GetMyCheckIns)          // 我的签到记录
		checkin.GET("/summary", h.GetCheckInSummary) // 签到统计
	}
}
