package instance_handler

import (
	"net/http"
	"time"

	"github.com/evolution-foundation/evolution-go/pkg/config"
	instance_model "github.com/evolution-foundation/evolution-go/pkg/instance/model"
	instance_repository "github.com/evolution-foundation/evolution-go/pkg/instance/repository"
	instance_service "github.com/evolution-foundation/evolution-go/pkg/instance/service"
	"github.com/evolution-foundation/evolution-go/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
)

type OxisInstanceHandler interface {
	Health(ctx *gin.Context)
	GetStatus(ctx *gin.Context)
	Connect(ctx *gin.Context)
	GetQr(ctx *gin.Context)
	Disconnect(ctx *gin.Context)
	Logout(ctx *gin.Context)
}

type oxisInstanceHandler struct {
	config          *config.Config
	instanceRepo    instance_repository.InstanceRepository
	instanceService instance_service.InstanceService
	clientPointer   map[string]*whatsmeow.Client
	startTime       time.Time
}

func (h *oxisInstanceHandler) getDefaultInstance() (*instance_model.Instance, error) {
	name := h.config.DefaultInstanceName
	if name == "" {
		name = "oxev-main"
	}

	instance, err := h.instanceRepo.GetInstanceByName(name)
	if err == nil && instance != nil {
		return instance, nil
	}

	instances, err := h.instanceRepo.GetAll("")
	if err == nil && len(instances) > 0 {
		return instances[0], nil
	}

	newInstance := instance_model.Instance{
		Id:         uuid.New().String(),
		Name:       name,
		Token:      utils.GenerateRandomString(32),
		Connected:  false,
		ClientName: "OXIS WhatsApp Automation",
	}
	created, err := h.instanceRepo.Create(newInstance)
	if err != nil {
		return nil, err
	}
	return created, nil
}


func (h *oxisInstanceHandler) resolveStatus(instance *instance_model.Instance) string {
	if instance == nil {
		return "DISCONNECTED"
	}

	client := h.clientPointer[instance.Id]
	if client == nil {
		if instance.Connected {
			return "CONNECTING"
		}
		if instance.Qrcode != "" {
			return "QR_READY"
		}
		return "DISCONNECTED"
	}

	if client.IsConnected() && client.IsLoggedIn() {
		return "CONNECTED"
	}

	if instance.Qrcode != "" {
		return "QR_READY"
	}

	if client.IsConnected() && !client.IsLoggedIn() {
		return "CONNECTING"
	}

	return "DISCONNECTED"
}

// Health returns service health and WhatsApp connection status
// @Summary Service Health Check
// @Description Returns health and WhatsApp instance connectivity status
// @Tags System
// @Produce json
// @Success 200 {object} gin.H "Health status"
// @Router /health [get]
func (h *oxisInstanceHandler) Health(ctx *gin.Context) {
	instance, _ := h.getDefaultInstance()
	status := h.resolveStatus(instance)

	instanceID := ""
	instanceName := ""
	if instance != nil {
		instanceID = instance.Id
		instanceName = instance.Name
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":      "ok",
		"service":     "oxis-whatsapp-automation",
		"environment": h.config.Environment,
		"uptime":      time.Since(h.startTime).String(),
		"whatsapp": gin.H{
			"instance_id":   instanceID,
			"instance_name": instanceName,
			"status":        status,
			"connected":     status == "CONNECTED",
		},
	})
}

// GetStatus returns the current status of the default WhatsApp instance
// @Summary Get WhatsApp Instance Status
// @Description Returns the connection status of the primary WhatsApp instance
// @Tags Instance
// @Produce json
// @Success 200 {object} gin.H "Instance status"
// @Router /api/v1/instance/status [get]
func (h *oxisInstanceHandler) GetStatus(ctx *gin.Context) {
	instance, err := h.getDefaultInstance()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INSTANCE_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	status := h.resolveStatus(instance)
	statusDetails, _ := h.instanceService.Status(instance)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"instance_id":   instance.Id,
			"instance_name": instance.Name,
			"status":        status,
			"connected":     status == "CONNECTED",
			"phone_number":  instance.Jid,
			"details":       statusDetails,
		},
	})
}

// Connect initializes and starts the default WhatsApp instance
// @Summary Connect WhatsApp Instance
// @Description Initiates the WhatsApp connection for the primary instance
// @Tags Instance
// @Produce json
// @Success 200 {object} gin.H "Instance connection initiated"
// @Router /api/v1/instance/connect [post]
func (h *oxisInstanceHandler) Connect(ctx *gin.Context) {
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

	connectData := &instance_service.ConnectStruct{
		Immediate: true,
	}

	updatedInstance, jid, _, err := h.instanceService.Connect(connectData, instance)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CONNECT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection initiated",
		"data": gin.H{
			"instance_id":   updatedInstance.Id,
			"instance_name": updatedInstance.Name,
			"jid":           jid,
			"status":        h.resolveStatus(updatedInstance),
		},
	})
}

// GetQr returns the latest QR code for linking WhatsApp
// @Summary Get WhatsApp QR Code
// @Description Returns the Base64 QR code image and pairing string
// @Tags Instance
// @Produce json
// @Success 200 {object} gin.H "QR Code payload"
// @Router /api/v1/instance/qr [get]
func (h *oxisInstanceHandler) GetQr(ctx *gin.Context) {
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

	status := h.resolveStatus(instance)
	if status == "CONNECTED" {
		ctx.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "WhatsApp instance is already connected",
			"data": gin.H{
				"status":       "CONNECTED",
				"connected":    true,
				"phone_number": instance.Jid,
			},
		})
		return
	}

	// Try getting existing QR code
	qr, err := h.instanceService.GetQr(instance)
	if err != nil || qr == nil || qr.Qrcode == "" {
		// Trigger connect to start QR generation
		connectData := &instance_service.ConnectStruct{
			Immediate: true,
		}
		_, _, _, _ = h.instanceService.Connect(connectData, instance)

		// Wait briefly and poll for fresh QR code
		for i := 0; i < 8; i++ {
			time.Sleep(500 * time.Millisecond)
			freshInstance, _ := h.instanceRepo.GetInstanceByID(instance.Id)
			if freshInstance != nil && freshInstance.Qrcode != "" {
				qr = &instance_service.QrcodeStruct{
					Qrcode: freshInstance.Qrcode,
				}
				instance = freshInstance
				break
			}
		}
	}

	if qr == nil || qr.Qrcode == "" {
		ctx.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"instance_id":   instance.Id,
				"instance_name": instance.Name,
				"status":        "CONNECTING",
				"qrcode":        "",
				"message":       "Generating fresh QR code, retrying...",
			},
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"instance_id":   instance.Id,
			"instance_name": instance.Name,
			"status":        "QR_READY",
			"qrcode":        qr.Qrcode,
			"code":          qr.Code,
		},
	})
}


// Disconnect disconnects the active WhatsApp socket session
// @Summary Disconnect WhatsApp Session
// @Description Disconnects the WhatsApp client connection
// @Tags Instance
// @Produce json
// @Success 200 {object} gin.H "Disconnected successfully"
// @Router /api/v1/instance/disconnect [post]
func (h *oxisInstanceHandler) Disconnect(ctx *gin.Context) {
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

	_, err = h.instanceService.Disconnect(instance)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DISCONNECT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "WhatsApp instance disconnected successfully",
	})
}

// Logout logs out the session from WhatsApp and clears session keys
// @Summary Logout WhatsApp Session
// @Description Logs out of WhatsApp and removes pairing credentials
// @Tags Instance
// @Produce json
// @Success 200 {object} gin.H "Logged out successfully"
// @Router /api/v1/instance/logout [delete]
func (h *oxisInstanceHandler) Logout(ctx *gin.Context) {
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

	_, err = h.instanceService.Logout(instance)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "LOGOUT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "WhatsApp instance logged out successfully",
	})
}

func NewOxisInstanceHandler(
	cfg *config.Config,
	instanceRepo instance_repository.InstanceRepository,
	instanceService instance_service.InstanceService,
	clientPointer map[string]*whatsmeow.Client,
) OxisInstanceHandler {
	return &oxisInstanceHandler{
		config:          cfg,
		instanceRepo:    instanceRepo,
		instanceService: instanceService,
		clientPointer:   clientPointer,
		startTime:       time.Now(),
	}
}
