package middleware

import (
	"strings"

	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT 认证中间件
func AuthMiddleware(jwtMgr *pkgJWT.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 从 Header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Missing authorization header")
			c.Abort()
			return
		}

		// 2. 验证 Bearer 格式
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 3. 验证 token
		claims, err := jwtMgr.ValidateToken(tokenString)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// 4. 将用户信息存入 context
		c.Set("userID", claims.UserID)
		c.Set("address", claims.Address)
		c.Set("did", claims.DID)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// OptionalAuthMiddleware 可选的 JWT 认证中间件 (不强制要求登录)
func OptionalAuthMiddleware(jwtMgr *pkgJWT.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]
		claims, err := jwtMgr.ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		// 存入用户信息
		c.Set("userID", claims.UserID)
		c.Set("address", claims.Address)
		c.Set("did", claims.DID)
		c.Set("role", claims.Role)

		c.Next()
	}
}
