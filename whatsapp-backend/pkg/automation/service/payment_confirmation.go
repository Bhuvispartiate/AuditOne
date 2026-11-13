package automation_service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/evolution-foundation/evolution-go/pkg/config"
	instance_model "github.com/evolution-foundation/evolution-go/pkg/instance/model"
	instance_repository "github.com/evolution-foundation/evolution-go/pkg/instance/repository"
	logger_wrapper "github.com/evolution-foundation/evolution-go/pkg/logger"
	message_model "github.com/evolution-foundation/evolution-go/pkg/message/model"
	message_repository "github.com/evolution-foundation/evolution-go/pkg/message/repository"
	send_service "github.com/evolution-foundation/evolution-go/pkg/sendMessage/service"
	template_service "github.com/evolution-foundation/evolution-go/pkg/templates/service"
	"github.com/evolution-foundation/evolution-go/pkg/utils"
	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
)

type PaymentConfirmationRequest struct {
	Phone          string      `json:"phone"`
	StudentName    string      `json:"student_name"`
	EventName      string      `json:"event_name"`
	RegistrationID string      `json:"registration_id"`
	Amount         interface{} `json:"amount"`
	PaymentID      string      `json:"payment_id"`
	IdempotencyKey string      `json:"idempotency_key,omitempty"`
}

type PaymentConfirmationResponse struct {
	ID                string     `json:"id"`
	Phone             string     `json:"phone"`
	ReferenceID       string     `json:"reference_id"`
	IdempotencyKey    string     `json:"idempotency_key"`
	Status            string     `json:"status"`
	WhatsappMessageID string     `json:"whatsapp_message_id,omitempty"`
	MessageContent    string     `json:"message_content,omitempty"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
}

type AutomationService interface {
	ProcessPaymentConfirmation(req *PaymentConfirmationRequest) (*PaymentConfirmationResponse, error)
	GetDefaultInstance() (*instance_model.Instance, error)
}

type automationService struct {
	config             *config.Config
	instanceRepo       instance_repository.InstanceRepository
	messageRepo        message_repository.MessageRepository
	templateService    template_service.TemplateService
	sendMessageService send_service.SendService
	clientPointer      map[string]*whatsmeow.Client
	loggerWrapper      *logger_wrapper.LoggerManager
}

func (s *automationService) GetDefaultInstance() (*instance_model.Instance, error) {
	instanceName := s.config.DefaultInstanceName
	if instanceName == "" {
		instanceName = "oxev-main"
	}

	instance, err := s.instanceRepo.GetInstanceByName(instanceName)
	if err == nil && instance != nil {
		return instance, nil
	}

	// If default name not found, try to get any existing instance
	instances, err := s.instanceRepo.GetAll("")
	if err == nil && len(instances) > 0 {
		return instances[0], nil
	}

	// Auto-create default instance if none exists
	newInstance := instance_model.Instance{
		Id:         uuid.New().String(),
		Name:       instanceName,
		Token:      utils.GenerateRandomString(32),
		Connected:  false,
		ClientName: "OXIS WhatsApp Automation",
	}
	created, err := s.instanceRepo.Create(newInstance)
	if err != nil {
		return nil, fmt.Errorf("failed to create default instance: %v", err)
	}
	return created, nil
}


func (s *automationService) ProcessPaymentConfirmation(req *PaymentConfirmationRequest) (*PaymentConfirmationResponse, error) {
	// Clean and validate phone number
	cleanPhone := strings.TrimSpace(req.Phone)
	cleanPhone = strings.TrimPrefix(cleanPhone, "+")
	if cleanPhone == "" {
		return nil, errors.New("phone number is required")
	}
	if req.StudentName == "" {
		return nil, errors.New("student_name is required")
	}
	if req.EventName == "" {
		return nil, errors.New("event_name is required")
	}
	if req.RegistrationID == "" {
		return nil, errors.New("registration_id is required")
	}

	// Determine idempotency key
	idempotencyKey := strings.TrimSpace(req.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("payment-confirmation-%s", req.RegistrationID)
	}

	// Check for duplicate processing
	existingLog, err := s.messageRepo.GetByIdempotencyKey(idempotencyKey)
	if err == nil && existingLog != nil {
		if existingLog.Status == "SENT" || existingLog.Status == "DELIVERED" || existingLog.Status == "DUPLICATE" {
			return &PaymentConfirmationResponse{
				ID:                existingLog.Id,
				Phone:             existingLog.Phone,
				ReferenceID:       existingLog.ReferenceID,
				IdempotencyKey:    existingLog.IdempotencyKey,
				Status:            "DUPLICATE",
				WhatsappMessageID: existingLog.WhatsappMessageID,
				MessageContent:    existingLog.MessageContent,
				SentAt:            existingLog.SentAt,
			}, nil
		}
	}

	// Render message template
	variables := map[string]interface{}{
		"student_name":    req.StudentName,
		"event_name":      req.EventName,
		"registration_id": req.RegistrationID,
		"amount":          req.Amount,
		"payment_id":      req.PaymentID,
	}

	renderedMessage, err := s.templateService.Render(template_service.TemplatePaymentConfirmation, variables)
	if err != nil {
		return nil, fmt.Errorf("failed to render template: %v", err)
	}

	// Fetch default WhatsApp instance
	instance, err := s.GetDefaultInstance()
	if err != nil {
		return nil, err
	}

	// Check if client is active and connected
	client := s.clientPointer[instance.Id]
	if client == nil || !client.IsConnected() {
		// Record failed attempt
		failedLog := &message_model.Message{
			Id:                 uuid.New().String(),
			Phone:              cleanPhone,
			MessageContent:     renderedMessage,
			TemplateName:       template_service.TemplatePaymentConfirmation,
			Source:             "oxev",
			ReferenceID:        req.RegistrationID,
			IdempotencyKey:     idempotencyKey,
			Status:             "FAILED",
			WhatsappInstanceID: instance.Id,
			ErrorMessage:       "WhatsApp client is not connected",
		}
		now := time.Now()
		failedLog.FailedAt = &now
		_ = s.messageRepo.CreateLog(failedLog)

		return nil, errors.New("WHATSAPP_DISCONNECTED: The configured WhatsApp instance is not connected. Please scan the QR code to connect.")
	}

	// Create initial processing record
	logRecord := &message_model.Message{
		Id:                 uuid.New().String(),
		Phone:              cleanPhone,
		MessageContent:     renderedMessage,
		TemplateName:       template_service.TemplatePaymentConfirmation,
		Source:             "oxev",
		ReferenceID:        req.RegistrationID,
		IdempotencyKey:     idempotencyKey,
		Status:             "PROCESSING",
		WhatsappInstanceID: instance.Id,
	}
	_ = s.messageRepo.CreateLog(logRecord)

	// Send message via sendMessageService
	textData := &send_service.TextStruct{
		Number: cleanPhone,
		Text:   renderedMessage,
	}

	sendResp, err := s.sendMessageService.SendText(textData, instance)
	if err != nil {
		s.loggerWrapper.GetLogger(instance.Id).LogError("Failed to send payment confirmation to %s: %v", cleanPhone, err)
		_ = s.messageRepo.UpdateMessageStatus(logRecord.Id, "FAILED", "", err.Error())
		return nil, fmt.Errorf("failed to send WhatsApp message: %v", err)
	}

	now := time.Now()
	whatsappMessageID := ""
	if sendResp != nil && sendResp.Info.ID != "" {
		whatsappMessageID = sendResp.Info.ID
	}

	// Update status to SENT
	_ = s.messageRepo.UpdateMessageStatus(logRecord.Id, "SENT", whatsappMessageID, "")

	return &PaymentConfirmationResponse{
		ID:                logRecord.Id,
		Phone:             cleanPhone,
		ReferenceID:       req.RegistrationID,
		IdempotencyKey:    idempotencyKey,
		Status:            "SENT",
		WhatsappMessageID: whatsappMessageID,
		MessageContent:    renderedMessage,
		SentAt:            &now,
	}, nil
}

func NewAutomationService(
	cfg *config.Config,
	instanceRepo instance_repository.InstanceRepository,
	messageRepo message_repository.MessageRepository,
	templateService template_service.TemplateService,
	sendMessageService send_service.SendService,
	clientPointer map[string]*whatsmeow.Client,
	loggerWrapper *logger_wrapper.LoggerManager,
) AutomationService {
	return &automationService{
		config:             cfg,
		instanceRepo:       instanceRepo,
		messageRepo:        messageRepo,
		templateService:    templateService,
		sendMessageService: sendMessageService,
		clientPointer:      clientPointer,
		loggerWrapper:      loggerWrapper,
	}
}
