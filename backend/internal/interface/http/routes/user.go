package routes

import (
	"github.com/dedata/dedata-backend/internal/interface/http/handler"
	"github.com/dedata/dedata-backend/internal/interface/http/middleware"
	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"github.com/gin-gonic/gin"
)

// RegisterUserRoutes 注册用户路由
func RegisterUserRoutes(r *gin.RouterGroup, h *handler.UserHandler, jwtMgr *pkgJWT.JWTManager) {
	user := r.Group("/user")
	{
		// 需要认证的路由
		user.GET("/me", middleware.AuthMiddleware(jwtMgr), h.GetMyInfo)
		user.GET("/profile", middleware.AuthMiddleware(jwtMgr), h.GetProfile)
		user.PUT("/profile", middleware.AuthMiddleware(jwtMgr), h.UpdateProfile)

		// 公开的排行榜
		user.GET("/leaderboard", h.GetLeaderboard)
	}
}
