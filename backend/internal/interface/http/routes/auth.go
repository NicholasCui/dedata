package routes

import (
	"github.com/dedata/dedata-backend/internal/interface/http/handler"
	"github.com/dedata/dedata-backend/internal/interface/http/middleware"
	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes 注册认证路由
func RegisterAuthRoutes(r *gin.RouterGroup, authHandler *handler.AuthHandler, jwtMgr *pkgJWT.JWTManager) {
	auth := r.Group("/auth")
	{
		// 公开路由
		auth.POST("/nonce", authHandler.GetNonce)
		auth.POST("/verify", authHandler.Verify)

		// 需要认证的路由
		authenticated := auth.Group("")
		authenticated.Use(middleware.AuthMiddleware(jwtMgr))
		{
			authenticated.POST("/logout", authHandler.Logout)
		}
	}
}
