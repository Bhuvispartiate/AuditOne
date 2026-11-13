package message_handler

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/evolution-foundation/evolution-go/pkg/config"
	instance_model "github.com/evolution-foundation/evolution-go/pkg/instance/model"
	instance_repository "github.com/evolution-foundation/evolution-go/pkg/instance/repository"
	logger_wrapper "github.com/evolution-foundation/evolution-go/pkg/logger"
	message_model "github.com/evolution-foundation/evolution-go/pkg/message/model"
	message_repository "github.com/evolution-foundation/evolution-go/pkg/message/repository"
	send_service "github.com/evolution-foundation/evolution-go/pkg/sendMessage/service"
	"github.com/evolution-foundation/evolution-go/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
)

type SendMessageRequest struct {
	Phone          string `json:"phone"`
	Message        string `json:"message"`
	Source         string `json:"source"`
	ReferenceID    string `json:"reference_id,omitempty"`
	IdempotencyKey string `json:"idempotency_key,omitempty"`
	DocumentBase64 string `json:"document_base64,omitempty"`
	DocumentName   string `json:"document_name,omitempty"`
}

type OxisMessageHandler interface {
	SendMessage(ctx *gin.Context)
}

type oxisMessageHandler struct {
	config             *config.Config
	instanceRepo       instance_repository.InstanceRepository
	messageRepo        message_repository.MessageRepository
	sendMessageService send_service.SendService
	clientPointer      map[string]*whatsmeow.Client
	loggerWrapper      *logger_wrapper.LoggerManager
}

func (h *oxisMessageHandler) getDefaultInstance() (*instance_model.Instance, error) {
	instanceName := h.config.DefaultInstanceName
	if instanceName == "" {
		instanceName = "oxev-main"
	}

	instance, err := h.instanceRepo.GetInstanceByName(instanceName)
	if err == nil && instance != nil {
		return instance, nil
	}

	instances, err := h.instanceRepo.GetAll("")
	if err == nil && len(instances) > 0 {
		return instances[0], nil
	}

	newInstance := instance_model.Instance{
		Id:         uuid.New().String(),
		Name:       instanceName,
		Token:      utils.GenerateRandomString(32),
		Connected:  false,
		ClientName: "OXIS WhatsApp Automation",
	}
	created, err := h.instanceRepo.Create(newInstance)
	if err != nil {
		return nil, fmt.Errorf("failed to create default instance: %v", err)
	}
	return created, nil
}


// SendMessage sends a text message to a WhatsApp number with idempotency support
// @Summary Send WhatsApp Message
// @Description Internal API endpoint for OXIS products to send WhatsApp text messages
// @Tags Messages
// @Accept json
// @Produce json
// @Param request body SendMessageRequest true "Message payload"
// @Success 200 {object} gin.H "Message sent successfully"
// @Failure 400 {object} gin.H "Validation error"
// @Failure 500 {object} gin.H "Send failure"
// @Failure 503 {object} gin.H "WhatsApp disconnected"
// @Router /api/v1/messages/send [post]
func (h *oxisMessageHandler) SendMessage(ctx *gin.Context) {
	var req SendMessageRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "Invalid request body: " + err.Error(),
			},
		})
		return
	}

	cleanPhone := strings.TrimSpace(req.Phone)
	cleanPhone = strings.TrimPrefix(cleanPhone, "+")
	if cleanPhone == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_PHONE",
				"message": "phone number is required",
			},
		})
		return
	}

	if req.Message == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_MESSAGE",
				"message": "message content is required",
			},
		})
		return
	}

	source := req.Source
	if source == "" {
		source = "oxev"
	}

	idempotencyKey := strings.TrimSpace(req.IdempotencyKey)

	// Check idempotency if key provided
	if idempotencyKey != "" {
		existingLog, err := h.messageRepo.GetByIdempotencyKey(idempotencyKey)
		if err == nil && existingLog != nil {
			if existingLog.Status == "SENT" || existingLog.Status == "DELIVERED" || existingLog.Status == "DUPLICATE" {
				ctx.JSON(http.StatusOK, gin.H{
					"success": true,
					"status":  "DUPLICATE",
					"message": "Message was already processed for this idempotency key",
					"data": gin.H{
						"id":                  existingLog.Id,
						"phone":               existingLog.Phone,
						"source":              existingLog.Source,
						"reference_id":        existingLog.ReferenceID,
						"idempotency_key":     existingLog.IdempotencyKey,
						"status":              "DUPLICATE",
						"whatsapp_message_id": existingLog.WhatsappMessageID,
						"sent_at":             existingLog.SentAt,
					},
				})
				return
			}
		}
	}

	instance, err := h.getDefaultInstance()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INSTANCE_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	client := h.clientPointer[instance.Id]
	if client == nil || !client.IsConnected() {
		// Log failure
		failedLog := &message_model.Message{
			Id:                 uuid.New().String(),
			Phone:              cleanPhone,
			MessageContent:     req.Message,
			Source:             source,
			ReferenceID:        req.ReferenceID,
			IdempotencyKey:     idempotencyKey,
			Status:             "FAILED",
			WhatsappInstanceID: instance.Id,
			ErrorMessage:       "WhatsApp client is not connected",
		}
		now := time.Now()
		failedLog.FailedAt = &now
		_ = h.messageRepo.CreateLog(failedLog)

		ctx.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "WHATSAPP_DISCONNECTED",
				"message": "The configured WhatsApp instance is not connected. Please connect via QR code.",
			},
		})
		return
	}

	// Create pending log record
	logRecord := &message_model.Message{
		Id:                 uuid.New().String(),
		Phone:              cleanPhone,
		MessageContent:     req.Message,
		Source:             source,
		ReferenceID:        req.ReferenceID,
		IdempotencyKey:     idempotencyKey,
		Status:             "PROCESSING",
		WhatsappInstanceID: instance.Id,
	}
	_ = h.messageRepo.CreateLog(logRecord)

	var sendResp *send_service.MessageSendStruct
	var err error

	if strings.TrimSpace(req.DocumentBase64) != "" {
		b64Parts := strings.SplitN(req.DocumentBase64, ",", 2)
		rawB64 := req.DocumentBase64
		if len(b64Parts) == 2 {
			rawB64 = b64Parts[1]
		}
		rawB64 = strings.TrimSpace(rawB64)
		fileBytes, decErr := base64.StdEncoding.DecodeString(rawB64)
		if decErr != nil {
			fileBytes, decErr = base64.URLEncoding.DecodeString(rawB64)
		}
		if decErr != nil {
			_ = h.messageRepo.UpdateMessageStatus(logRecord.Id, "FAILED", "", "Failed to decode document base64: "+decErr.Error())
			ctx.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_DOCUMENT_BASE64",
					"message": "Failed to decode base64 document: " + decErr.Error(),
				},
			})
			return
		}

		docName := req.DocumentName
		if docName == "" {
			docName = "Ticket_Pass.pdf"
		}

		mediaData := &send_service.MediaStruct{
			Number:   cleanPhone,
			Type:     "document",
			Caption:  req.Message,
			Filename: docName,
		}

		sendResp, err = h.sendMessageService.SendMediaFile(mediaData, fileBytes, instance)
	} else {
		textData := &send_service.TextStruct{
			Number: cleanPhone,
			Text:   req.Message,
		}
		sendResp, err = h.sendMessageService.SendText(textData, instance)
	}

	if err != nil {
		_ = h.messageRepo.UpdateMessageStatus(logRecord.Id, "FAILED", "", err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SEND_FAILED",
				"message": "Failed to dispatch WhatsApp message: " + err.Error(),
			},
		})
		return
	}

	now := time.Now()
	whatsappMessageID := ""
	if sendResp != nil && sendResp.Info.ID != "" {
		whatsappMessageID = sendResp.Info.ID
	}

	_ = h.messageRepo.UpdateMessageStatus(logRecord.Id, "SENT", whatsappMessageID, "")

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  "SENT",
		"data": gin.H{
			"id":                  logRecord.Id,
			"phone":               cleanPhone,
			"source":              source,
			"reference_id":        req.ReferenceID,
			"idempotency_key":     idempotencyKey,
			"status":              "SENT",
			"whatsapp_message_id": whatsappMessageID,
			"sent_at":             now,
		},
	})
}

func NewOxisMessageHandler(
	cfg *config.Config,
	instanceRepo instance_repository.InstanceRepository,
	messageRepo message_repository.MessageRepository,
	sendMessageService send_service.SendService,
	clientPointer map[string]*whatsmeow.Client,
	loggerWrapper *logger_wrapper.LoggerManager,
) OxisMessageHandler {
	return &oxisMessageHandler{
		config:             cfg,
		instanceRepo:       instanceRepo,
		messageRepo:        messageRepo,
		sendMessageService: sendMessageService,
		clientPointer:      clientPointer,
		loggerWrapper:      loggerWrapper,
	}
}
