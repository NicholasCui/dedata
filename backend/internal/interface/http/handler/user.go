package handler

import (
	"net/http"
	"strconv"

	"github.com/dedata/dedata-backend/internal/interface/dto"
	"github.com/dedata/dedata-backend/internal/usecase"
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// UserHandler 用户相关处理器
type UserHandler struct {
	userUC *usecase.UserUseCase
}

// NewUserHandler 创建用户处理器
func NewUserHandler(userUC *usecase.UserUseCase) *UserHandler {
	return &UserHandler{
		userUC: userUC,
	}
}

// GetMyInfo 获取我的信息
// GET /api/user/me
func (h *UserHandler) GetMyInfo(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 调用 UseCase
	user, err := h.userUC.GetUserInfo(c.Request.Context(), userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, user)
}

// GetProfile 获取用户 Profile
// GET /api/user/profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 调用 UseCase
	profile, err := h.userUC.GetProfile(c.Request.Context(), userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, profile)
}

// GetLeaderboard 获取排行榜
// GET /api/user/leaderboard?page=1&limit=20
func (h *UserHandler) GetLeaderboard(c *gin.Context) {
	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// 调用 UseCase
	leaderboard, err := h.userUC.GetLeaderboard(c.Request.Context(), page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, leaderboard)
}

// UpdateProfile 更新用户 Profile
// PUT /api/user/profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 解析请求体
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request body")
		return
	}

	// 调用 UseCase
	profile, err := h.userUC.UpdateProfile(c.Request.Context(), userID.(string), &req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, profile)
}
