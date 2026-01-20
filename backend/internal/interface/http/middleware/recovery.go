package middleware

import (
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// Recovery middleware for panic recovery
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, err interface{}) {
		response.InternalError(c, "Internal server error")
		c.Abort()
	})
}
