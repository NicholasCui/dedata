package handler

import (
	"github.com/dedata/dedata-backend/internal/interface/dto"
	"github.com/dedata/dedata-backend/internal/usecase"
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authUseCase *usecase.AuthUseCase
}

func NewAuthHandler(authUseCase *usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
	}
}

// GetNonce handles nonce generation
// @Summary Generate nonce for wallet login
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.NonceRequest true "Nonce Request"
// @Success 200 {object} dto.NonceResponse
// @Router /auth/nonce [post]
func (h *AuthHandler) GetNonce(c *gin.Context) {
	var req dto.NonceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := h.authUseCase.GenerateNonce(c.Request.Context(), &req)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, resp)
}

// Verify handles signature verification
// @Summary Verify signature and login/register
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.VerifyRequest true "Verify Request"
// @Success 200 {object} dto.AuthResponse
// @Router /auth/verify [post]
func (h *AuthHandler) Verify(c *gin.Context) {
	var req dto.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := h.authUseCase.VerifySignature(c.Request.Context(), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, resp)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// JWT 是无状态的,logout 主要由前端清除 token
	// 如果需要黑名单机制,可以在这里添加
	response.Success(c, gin.H{
		"success": true,
	})
}
