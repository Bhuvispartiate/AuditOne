package automation_handler

import (
	"net/http"
	"strings"

	automation_service "github.com/evolution-foundation/evolution-go/pkg/automation/service"
	"github.com/gin-gonic/gin"
)

type AutomationHandler interface {
	PaymentConfirmation(ctx *gin.Context)
}

type automationHandler struct {
	automationService automation_service.AutomationService
}

// PaymentConfirmation handles automated payment confirmation messages for event registrations
// @Summary Send event registration payment confirmation WhatsApp message
// @Description Sends a verified payment confirmation notification to the student's WhatsApp number with deduplication
// @Tags Automation
// @Accept json
// @Produce json
// @Param request body automation_service.PaymentConfirmationRequest true "Payment confirmation payload"
// @Success 200 {object} gin.H "Confirmation processed"
// @Failure 400 {object} gin.H "Validation error"
// @Failure 500 {object} gin.H "Send or server error"
// @Failure 503 {object} gin.H "WhatsApp disconnected"
// @Router /api/v1/automation/payment-confirmation [post]
func (h *automationHandler) PaymentConfirmation(ctx *gin.Context) {
	var req automation_service.PaymentConfirmationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Failed to parse request body: " + err.Error(),
			},
		})
		return
	}

	if req.Phone == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_PHONE",
				"message": "Student phone number is required",
			},
		})
		return
	}

	if req.StudentName == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_STUDENT_NAME",
				"message": "student_name is required",
			},
		})
		return
	}

	if req.EventName == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_EVENT_NAME",
				"message": "event_name is required",
			},
		})
		return
	}

	if req.RegistrationID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_REGISTRATION_ID",
				"message": "registration_id is required",
			},
		})
		return
	}

	resp, err := h.automationService.ProcessPaymentConfirmation(&req)
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "WHATSAPP_DISCONNECTED") {
			ctx.JSON(http.StatusServiceUnavailable, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "WHATSAPP_DISCONNECTED",
					"message": "The configured WhatsApp instance is not connected. Please connect via QR code.",
				},
			})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEND_FAILED",
				"message": errStr,
			},
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  resp.Status,
		"data":    resp,
	})
}

func NewAutomationHandler(service automation_service.AutomationService) AutomationHandler {
	return &automationHandler{automationService: service}
}
