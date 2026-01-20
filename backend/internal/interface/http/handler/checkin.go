package handler

import (
	"net/http"
	"strconv"

	"github.com/dedata/dedata-backend/internal/interface/dto"
	"github.com/dedata/dedata-backend/internal/usecase"
	"github.com/dedata/dedata-backend/pkg/response"
	"github.com/gin-gonic/gin"
)

// CheckInHandler 签到相关处理器
type CheckInHandler struct {
	checkinUC *usecase.CheckInUseCase
}

// NewCheckInHandler 创建签到处理器
func NewCheckInHandler(checkinUC *usecase.CheckInUseCase) *CheckInHandler {
	return &CheckInHandler{
		checkinUC: checkinUC,
	}
}

// CheckIn 发起签到
// POST /api/checkin
func (h *CheckInHandler) CheckIn(c *gin.Context) {
	// 从上下文中获取用户 ID (由 AuthMiddleware 设置)
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 调用 UseCase
	checkin, challenge, err := h.checkinUC.CheckIn(c.Request.Context(), userID.(string))
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	// 如果有支付挑战，返回 HTTP 402
	if challenge != nil {
		c.JSON(http.StatusPaymentRequired, dto.CheckInResponse{
			Success: false,
			Message: "Payment required",
			L402Challenge: &dto.L402Challenge{
				OrderID:        challenge.OrderID,
				PaymentAddress: challenge.PaymentAddress,
				PriceAmount:    challenge.PriceAmount,
				BlockchainName: challenge.BlockchainName,
				TokenSymbol:    challenge.TokenSymbol,
				ExpiresAt:      challenge.ExpiresAt,
			},
		})
		return
	}

	// 如果没有挑战（理论上不会走到这里），返回签到记录
	response.Success(c, checkin)
}

// VerifyCheckIn 验证签到支付
// POST /api/checkin/verify
func (h *CheckInHandler) VerifyCheckIn(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 绑定请求
	var req dto.VerifyCheckInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	// 调用 UseCase
	success, message, err := h.checkinUC.VerifyCheckin(c.Request.Context(), req.OrderID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, dto.VerifyCheckInResponse{
		Success: success,
		Message: message,
	})
}

// GetMyCheckIns 获取我的签到记录
// GET /api/checkin/my?page=1&pageSize=10
func (h *CheckInHandler) GetMyCheckIns(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 调用 UseCase
	checkins, total, err := h.checkinUC.GetMyCheckIns(c.Request.Context(), userID.(string), page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":     checkins,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetCheckInSummary 获取签到统计
// GET /api/checkin/summary
func (h *CheckInHandler) GetCheckInSummary(c *gin.Context) {
	// 从上下文中获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 调用 UseCase
	summary, err := h.checkinUC.GetCheckInSummary(c.Request.Context(), userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, summary)
}
