package main

import (
	"context"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/proto/waCompanionReg"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ==============================================================================
// 1. DATA MODELS & DATABASE SCHEMA
// ==============================================================================

type MessageLog struct {
	ID                string     `gorm:"primaryKey;size:64" json:"id"`
	Phone             string     `gorm:"size:32;index" json:"phone"`
	StudentName       string     `gorm:"size:255" json:"student_name,omitempty"`
	EventName         string     `gorm:"size:255" json:"event_name,omitempty"`
	ReferenceID       string     `gorm:"size:100;index" json:"reference_id,omitempty"`
	IdempotencyKey    string     `gorm:"size:255;uniqueIndex" json:"idempotency_key"`
	MessageContent    string     `gorm:"type:text" json:"message_content"`
	Status            string     `gorm:"size:32;index" json:"status"` // SENT, DUPLICATE, FAILED
	WhatsAppMessageID string     `gorm:"size:100" json:"whatsapp_message_id,omitempty"`
	ErrorMessage      string     `gorm:"type:text" json:"error_message,omitempty"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
}

type MessageTemplate struct {
	ID        string    `gorm:"primaryKey;size:64" json:"id"`
	Name      string    `gorm:"size:100;uniqueIndex" json:"name"`
	Content   string    `gorm:"type:text" json:"content"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// ==============================================================================
// 2. WHATSAPP MANAGER & STATE ENGINE
// ==============================================================================

type WhatsAppManager struct {
	client       *whatsmeow.Client
	container    *sqlstore.Container
	db           *gorm.DB
	mu           sync.RWMutex
	currentQR    string
	currentRawQR string
	status       string // DISCONNECTED, CONNECTING, QR_READY, CONNECTED
	instanceName string
	connectedJID string
	startTime    time.Time
	isStarting   bool
}

func NewWhatsAppManager(db *gorm.DB, instanceName string, authDSN string) (*WhatsAppManager, error) {
	maj, min, patch := fetchWhatsAppWebVersion()
	store.SetWAVersion(store.WAVersionContainer{maj, min, patch})

	wm := &WhatsAppManager{
		db:           db,
		instanceName: instanceName,
		status:       "DISCONNECTED",
		startTime:    time.Now(),
	}

	// Initialize Whatsmeow sqlstore container
	dbLog := waLog.Stdout("WhatsApp-Store", "INFO", true)
	var container *sqlstore.Container
	var err error

	if authDSN != "" && strings.HasPrefix(authDSN, "postgres") {
		container, err = sqlstore.New(context.Background(), "postgres", authDSN, dbLog)
		if err != nil {
			fmt.Printf(" [WARN] Postgres auth store connection failed: %v. Falling back to local SQLite.\n", err)
			container = nil
		}
	}
	if container == nil {
		_ = os.MkdirAll("./dbdata", 0755)
		dsn := "file:./dbdata/oxis_auth.db?_pragma=foreign_keys(1)&_busy_timeout=5000&cache=shared&mode=rwc&_journal_mode=WAL"
		container, err = sqlstore.New(context.Background(), "sqlite", dsn, dbLog)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create whatsmeow store: %w", err)
	}

	wm.container = container
	return wm, nil
}

func fetchWhatsAppWebVersion() (uint32, uint32, uint32) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://web.whatsapp.com/sw.js")
	if err == nil {
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err == nil {
			patterns := []string{
				`"client_revision":\s*(\d+)`,
				`\\"client_revision\\":\s*(\d+)`,
				`client_revision\\?\\"?:[\s]*(\d+)`,
				`["']client_revision["'][\s]*:[\s]*(\d+)`,
				`client_revision.*?(\d+)`,
			}
			for _, pattern := range patterns {
				re := regexp.MustCompile(pattern)
				matches := re.FindStringSubmatch(string(body))
				if len(matches) >= 2 {
					if rev, err := strconv.Atoi(matches[1]); err == nil && rev > 0 {
						return 2, 3000, uint32(rev)
					}
				}
			}
		}
	}
	// Fallback to latest confirmed valid version
	return 2, 3000, 1054468000
}

func init() {
	maj, min, patch := fetchWhatsAppWebVersion()
	store.SetWAVersion(store.WAVersionContainer{maj, min, patch})
}

func (wm *WhatsAppManager) Start(forceNewPairing bool) error {
	wm.mu.Lock()
	if wm.isStarting {
		wm.mu.Unlock()
		return nil
	}
	if !forceNewPairing && wm.client != nil && wm.client.IsConnected() {
		wm.status = "CONNECTED"
		if wm.client.Store.ID != nil {
			wm.connectedJID = wm.client.Store.ID.String()
		}
		wm.mu.Unlock()
		return nil
	}

	wm.isStarting = true
	wm.status = "CONNECTING"
	if wm.client != nil {
		wm.client.Disconnect()
	}

	var deviceStore *store.Device
	var err error

	if forceNewPairing {
		deviceStore = wm.container.NewDevice()
	} else {
		deviceStore, err = wm.container.GetFirstDevice(context.Background())
		if err != nil || deviceStore == nil {
			deviceStore = wm.container.NewDevice()
		}
	}

	maj, min, patch := fetchWhatsAppWebVersion()
	store.SetWAVersion(store.WAVersionContainer{maj, min, patch})
	fmt.Printf(" [WhatsApp] Using WhatsApp Web client version: %d.%d.%d\n", maj, min, patch)
	if store.DeviceProps.Version == nil {
		store.DeviceProps.Version = &waCompanionReg.DeviceProps_AppVersion{}
	}
	store.DeviceProps.Version.Primary = proto.Uint32(maj)
	store.DeviceProps.Version.Secondary = proto.Uint32(min)
	store.DeviceProps.Version.Tertiary = proto.Uint32(patch)

	store.DeviceProps.PlatformType = waCompanionReg.DeviceProps_CHROME.Enum()
	store.DeviceProps.Os = proto.String("Chrome (Windows)")
	store.DeviceProps.RequireFullSync = proto.Bool(false)
	store.DeviceProps.HistorySyncConfig = &waCompanionReg.DeviceProps_HistorySyncConfig{
		FullSyncDaysLimit:   proto.Uint32(0),
		FullSyncSizeMbLimit: proto.Uint32(0),
		StorageQuotaMb:      proto.Uint32(0),
	}

	clientLog := waLog.Stdout("WhatsApp-Client", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(wm.eventHandler)

	wm.client = client
	wm.mu.Unlock()

	defer func() {
		wm.mu.Lock()
		wm.isStarting = false
		wm.mu.Unlock()
	}()

	if client.Store.ID != nil && !forceNewPairing {
		fmt.Printf(" [OXIS] Found existing linked session for: %s\n", client.Store.ID.String())
		err := client.Connect()
		if err != nil {
			fmt.Printf(" [OXIS] Reconnection error: %v. Starting fresh pairing...\n", err)
			return wm.Start(true)
		}
		wm.mu.Lock()
		wm.status = "CONNECTED"
		wm.connectedJID = client.Store.ID.String()
		wm.currentQR = ""
		wm.currentRawQR = ""
		wm.mu.Unlock()
	} else {
		qrChan, _ := client.GetQRChannel(context.Background())
		err := client.Connect()
		if err != nil {
			wm.mu.Lock()
			wm.status = "DISCONNECTED"
			wm.mu.Unlock()
			return fmt.Errorf("failed to connect whatsapp socket: %w", err)
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					wm.mu.Lock()
					wm.currentRawQR = evt.Code
					pngBytes, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
					if err == nil {
						wm.currentQR = "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
						wm.status = "QR_READY"
						fmt.Println(" [OXIS] Fresh authentic WhatsApp QR code generated.")
					}
					wm.mu.Unlock()
				} else if evt.Event == "timeout" {
					fmt.Println(" [OXIS] QR code timed out.")
					wm.mu.Lock()
					wm.currentQR = ""
					wm.currentRawQR = ""
					if wm.status != "CONNECTED" {
						wm.status = "DISCONNECTED"
					}
					wm.mu.Unlock()
					return
				} else if evt.Event == "success" {
					fmt.Println(" [OXIS] QR scan successful! WhatsApp Paired.")
					wm.mu.Lock()
					wm.status = "CONNECTED"
					wm.currentQR = ""
					wm.currentRawQR = ""
					if wm.client != nil && wm.client.Store.ID != nil {
						wm.connectedJID = wm.client.Store.ID.String()
					}
					wm.mu.Unlock()
				}
			}
		}()
	}

	return nil
}

func (wm *WhatsAppManager) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Connected:
		wm.mu.Lock()
		if wm.client != nil && wm.client.Store.ID != nil {
			wm.status = "CONNECTED"
			wm.connectedJID = wm.client.Store.ID.String()
			wm.currentQR = ""
			wm.currentRawQR = ""
			fmt.Printf(" [OXIS] WhatsApp Successfully Linked & Connected: %s\n", wm.connectedJID)
		}
		wm.mu.Unlock()

	case *events.PairSuccess:
		wm.mu.Lock()
		wm.status = "CONNECTED"
		if wm.client != nil && wm.client.Store.ID != nil {
			wm.connectedJID = wm.client.Store.ID.String()
		}
		wm.currentQR = ""
		wm.currentRawQR = ""
		fmt.Printf(" [OXIS] WhatsApp PairSuccess Event Received: %s\n", wm.connectedJID)
		wm.mu.Unlock()

	case *events.ClientOutdated:
		wm.mu.Lock()
		wm.status = "DISCONNECTED"
		wm.connectedJID = ""
		wm.currentQR = ""
		wm.currentRawQR = ""
		wm.mu.Unlock()
		fmt.Printf(" [OXIS] WhatsApp Client Outdated event received. Refreshing version and pairing...\n")
		go func() {
			time.Sleep(2 * time.Second)
			maj, min, patch := fetchWhatsAppWebVersion()
			store.SetWAVersion(store.WAVersionContainer{maj, min, patch})
			_ = wm.Start(true)
		}()

	case *events.LoggedOut:
		wm.mu.Lock()
		wm.status = "DISCONNECTED"
		wm.connectedJID = ""
		wm.currentQR = ""
		wm.currentRawQR = ""
		wm.mu.Unlock()
		fmt.Printf(" [OXIS] WhatsApp Session Logged Out: %v\n", v.Reason)

	case *events.Disconnected:
		fmt.Println(" [OXIS] WhatsApp socket temporarily disconnected (auto-reconnecting)...")
		if wm.client != nil && wm.client.Store.ID != nil {
			go func() {
				time.Sleep(1 * time.Second)
				wm.mu.RLock()
				c := wm.client
				wm.mu.RUnlock()
				if c != nil && !c.IsConnected() && c.Store.ID != nil {
					_ = c.Connect()
				}
			}()
		}
	}
}

func (wm *WhatsAppManager) SendTextMessage(phone string, message string) (string, error) {
	wm.mu.RLock()
	client := wm.client
	wm.mu.RUnlock()

	if client == nil {
		return "", fmt.Errorf("whatsapp instance '%s' is not initialized", wm.instanceName)
	}

	if client.Store.ID == nil {
		return "", fmt.Errorf("whatsapp instance '%s' is not paired (please scan QR code)", wm.instanceName)
	}

	if !client.IsConnected() {
		fmt.Printf(" [OXIS] WhatsApp socket re-connecting for: %s\n", client.Store.ID.String())
		_ = client.Connect()
		for i := 0; i < 8; i++ {
			if client.IsConnected() {
				break
			}
			time.Sleep(250 * time.Millisecond)
		}
		if !client.IsConnected() {
			return "", fmt.Errorf("whatsapp instance '%s' is reconnecting, please retry in 2 seconds", wm.instanceName)
		}
	}

	cleanPhone := regexp.MustCompile("[^0-9]").ReplaceAllString(phone, "")
	if strings.HasPrefix(cleanPhone, "0") {
		cleanPhone = cleanPhone[1:]
	}
	if len(cleanPhone) == 10 {
		cleanPhone = "91" + cleanPhone
	}

	recipientJID := types.NewJID(cleanPhone, types.DefaultUserServer)

	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	resp, err := client.SendMessage(context.Background(), recipientJID, msg)
	if err != nil {
		return "", fmt.Errorf("failed to send message via WhatsApp: %w", err)
	}

	return resp.ID, nil
}

func (wm *WhatsAppManager) SendDocumentMessage(phone string, message string, base64Data string, fileName string) (string, error) {
	wm.mu.RLock()
	client := wm.client
	wm.mu.RUnlock()

	if client == nil {
		return "", fmt.Errorf("whatsapp instance '%s' is not initialized", wm.instanceName)
	}

	if client.Store.ID == nil {
		return "", fmt.Errorf("whatsapp instance '%s' is not paired (please scan QR code)", wm.instanceName)
	}

	if !client.IsConnected() {
		fmt.Printf(" [OXIS] WhatsApp socket re-connecting for: %s\n", client.Store.ID.String())
		_ = client.Connect()
		for i := 0; i < 8; i++ {
			if client.IsConnected() {
				break
			}
			time.Sleep(250 * time.Millisecond)
		}
		if !client.IsConnected() {
			return "", fmt.Errorf("whatsapp instance '%s' is reconnecting, please retry in 2 seconds", wm.instanceName)
		}
	}

	cleanPhone := regexp.MustCompile("[^0-9]").ReplaceAllString(phone, "")
	if strings.HasPrefix(cleanPhone, "0") {
		cleanPhone = cleanPhone[1:]
	}
	if len(cleanPhone) == 10 {
		cleanPhone = "91" + cleanPhone
	}
	recipientJID := types.NewJID(cleanPhone, types.DefaultUserServer)

	b64Parts := strings.SplitN(base64Data, ",", 2)
	actualBase64 := base64Data
	if len(b64Parts) == 2 {
		actualBase64 = b64Parts[1]
	}
	actualBase64 = strings.TrimSpace(actualBase64)

	data, err := base64.StdEncoding.DecodeString(actualBase64)
	if err != nil {
		data, err = base64.URLEncoding.DecodeString(actualBase64)
		if err != nil {
			return "", fmt.Errorf("failed to decode base64 document: %w", err)
		}
	}

	uploadResp, err := client.Upload(context.Background(), data, whatsmeow.MediaDocument)
	if err != nil {
		return "", fmt.Errorf("failed to upload document to whatsapp: %w", err)
	}

	if fileName == "" {
		fileName = "Ticket_Pass.pdf"
	}

	docMsg := &waProto.DocumentMessage{
		URL:           proto.String(uploadResp.URL),
		DirectPath:    proto.String(uploadResp.DirectPath),
		MediaKey:      uploadResp.MediaKey,
		Mimetype:      proto.String("application/pdf"),
		FileEncSHA256: uploadResp.FileEncSHA256,
		FileSHA256:    uploadResp.FileSHA256,
		FileLength:    proto.Uint64(uint64(len(data))),
		Title:         proto.String(fileName),
		FileName:      proto.String(fileName),
	}

	var msg *waProto.Message
	if strings.TrimSpace(message) != "" {
		docMsg.Caption = proto.String(message)
		msg = &waProto.Message{
			DocumentWithCaptionMessage: &waProto.FutureProofMessage{
				Message: &waProto.Message{
					DocumentMessage: docMsg,
				},
			},
		}
	} else {
		msg = &waProto.Message{
			DocumentMessage: docMsg,
		}
	}

	resp, err := client.SendMessage(context.Background(), recipientJID, msg)
	if err != nil {
		return "", fmt.Errorf("failed to send document message via WhatsApp: %w", err)
	}

	return resp.ID, nil
}

func (wm *WhatsAppManager) Disconnect() {
	wm.mu.Lock()
	defer wm.mu.Unlock()
	if wm.client != nil {
		wm.client.Disconnect()
	}
	wm.status = "DISCONNECTED"
	wm.currentQR = ""
	wm.currentRawQR = ""
	wm.connectedJID = ""
}

// ==============================================================================
// 3. TEMPLATE RENDERER
// ==============================================================================

func RenderTemplate(templateStr string, vars map[string]string) string {
	result := templateStr
	for k, v := range vars {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}

const DefaultPaymentTemplate = "Hi {{student_name}}! \n\n Payment Successful!\n\nYour payment of *INR {{amount}}* for *{{event_name}}* has been successfully received.\n\n Your registration is confirmed.\n\n Registration ID: {{registration_id}}\n Payment ID: {{payment_id}}\n\nYou will receive further event updates on this WhatsApp number.\n\nThank you!\n*OXEV Team*"

// ==============================================================================
// 4. REST API SERVER & HANDLERS
// ==============================================================================

type PaymentConfirmationReq struct {
	Phone          string `json:"phone" binding:"required"`
	StudentName    string `json:"student_name" binding:"required"`
	EventName      string `json:"event_name" binding:"required"`
	RegistrationID string `json:"registration_id" binding:"required"`
	Amount         int64  `json:"amount" binding:"required"`
	PaymentID      string `json:"payment_id" binding:"required"`
	IdempotencyKey string `json:"idempotency_key"`
}

type DirectMessageReq struct {
	Phone          string `json:"phone" binding:"required"`
	Message        string `json:"message" binding:"required"`
	ReferenceID    string `json:"reference_id"`
	IdempotencyKey string `json:"idempotency_key"`
	DocumentBase64 string `json:"document_base64"`
	DocumentName   string `json:"document_name"`
}

func AuthMiddleware(oxevKey string, globalKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				token = strings.TrimSpace(parts[1])
			} else {
				token = strings.TrimSpace(authHeader)
			}
		}
		if token == "" {
			token = c.GetHeader("apikey")
		}

		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "UNAUTHORIZED", "message": "API key is required in Authorization or apikey header"},
			})
			return
		}

		isOxev := subtle.ConstantTimeCompare([]byte(token), []byte(oxevKey)) == 1
		isGlobal := subtle.ConstantTimeCompare([]byte(token), []byte(globalKey)) == 1

		if !isOxev && !isGlobal {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "Invalid API key provided"},
			})
			return
		}

		c.Next()
	}
}

// ==============================================================================
// 5. MAIN ENTRYPOINT
// ==============================================================================

func main() {
	_ = godotenv.Load(".env")

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "8080"
	}

	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	oxevKey := os.Getenv("OXEV_SERVICE_API_KEY")
	if oxevKey == "" {
		oxevKey = "oxev_service_secret_key_change_me_in_production"
	}

	globalKey := os.Getenv("OXIS_GLOBAL_API_KEY")
	if globalKey == "" {
		globalKey = "oxis_global_secret_key_change_me_in_production"
	}

	instanceName := os.Getenv("WHATSAPP_INSTANCE_NAME")
	if instanceName == "" {
		instanceName = "oxev-main"
	}

	fmt.Println("==========================================================")
	fmt.Printf("   OXIS WhatsApp Automation Engine (Custom Server)\n")
	fmt.Printf("   Environment: %s | Instance: %s | Port: %s\n", environment, instanceName, port)
	fmt.Println("==========================================================")

	// 1. Initialize Main Database (PostgreSQL / SQLite)
	usersDBDSN := os.Getenv("POSTGRES_USERS_DB")
	authDBDSN := os.Getenv("POSTGRES_AUTH_DB")

	var db *gorm.DB
	var err error

	if usersDBDSN != "" && strings.HasPrefix(usersDBDSN, "postgres") {
		db, err = gorm.Open(postgres.Open(usersDBDSN), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		})
		if err != nil {
			fmt.Printf(" [WARN] Postgres users connection failed: %v. Using local SQLite.\n", err)
			_ = os.MkdirAll("./dbdata", 0755)
			db, _ = gorm.Open(sqlite.Open("./dbdata/oxis_users.db"), &gorm.Config{})
		} else {
			fmt.Println(" [OK] Connected to PostgreSQL users database.")
		}
	} else {
		_ = os.MkdirAll("./dbdata", 0755)
		db, _ = gorm.Open(sqlite.Open("./dbdata/oxis_users.db"), &gorm.Config{})
		fmt.Println(" [OK] Using local SQLite database at ./dbdata/oxis_users.db")
	}

	// Auto-migrate tables
	_ = db.AutoMigrate(&MessageLog{}, &MessageTemplate{})

	// Seed default template
	var existingTemplate MessageTemplate
	if err := db.Where("name = ?", "payment_confirmation").First(&existingTemplate).Error; err != nil {
		db.Create(&MessageTemplate{
			ID:       uuid.New().String(),
			Name:     "payment_confirmation",
			Content:  DefaultPaymentTemplate,
			IsActive: true,
		})
		fmt.Println(" [OK] Initialized default 'payment_confirmation' message template.")
	}

	// 2. Initialize WhatsApp Manager
	wm, err := NewWhatsAppManager(db, instanceName, authDBDSN)
	if err != nil {
		fmt.Printf(" [FATAL] WhatsApp Manager initialization error: %v\n", err)
		return
	}

	_ = wm.Start(false)

	// 3. Setup Gin Web Server
	if environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Enable CORS for Vercel and all origins
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept, apikey, ApiKey, X-API-Key")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(200)
			return
		}
		c.Next()
	})

	// Static Dashboard Routes
	r.StaticFile("/", "./public/index.html")
	r.StaticFile("/dashboard", "./public/index.html")
	r.Static("/public", "./public")

	// ==========================================
	// HEALTH & STATUS
	// ==========================================
	r.GET("/health", func(c *gin.Context) {
		wm.mu.RLock()
		st := wm.status
		jid := wm.connectedJID
		wm.mu.RUnlock()

		c.JSON(http.StatusOK, gin.H{
			"service":     "oxis-whatsapp-automation",
			"version":     "2.0.0-custom",
			"status":      "ok",
			"environment": environment,
			"uptime":      time.Since(wm.startTime).String(),
			"whatsapp": gin.H{
				"instance_name": instanceName,
				"status":        st,
				"connected":     st == "CONNECTED",
				"phone":         jid,
			},
		})
	})

	// ==========================================
	// INSTANCE MANAGEMENT
	// ==========================================
	r.GET("/api/v1/instance/status", func(c *gin.Context) {
		wm.mu.RLock()
		st := wm.status
		jid := wm.connectedJID
		wm.mu.RUnlock()

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"instance_name": instanceName,
				"status":        st,
				"connected":     st == "CONNECTED",
				"phone_number":  jid,
			},
		})
	})

	r.GET("/api/v1/instance/qr", func(c *gin.Context) {
		wm.mu.RLock()
		st := wm.status
		qr := wm.currentQR
		code := wm.currentRawQR
		jid := wm.connectedJID
		isStarting := wm.isStarting
		wm.mu.RUnlock()

		if st == "CONNECTED" {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"instance_name": instanceName,
					"status":        "CONNECTED",
					"connected":     true,
					"phone_number":  jid,
				},
			})
			return
		}

		if qr == "" && st == "DISCONNECTED" && !isStarting {
			go func() { _ = wm.Start(false) }()
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"instance_name": instanceName,
				"status":        st,
				"qrcode":        qr,
				"code":          code,
			},
		})
	})

	r.POST("/api/v1/instance/connect", func(c *gin.Context) {
		wm.mu.RLock()
		st := wm.status
		isStarting := wm.isStarting
		wm.mu.RUnlock()

		if st != "CONNECTED" && !isStarting {
			go func() { _ = wm.Start(true) }()
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "WhatsApp connection sequence initiated",
		})
	})


	r.POST("/api/v1/instance/disconnect", AuthMiddleware(oxevKey, globalKey), func(c *gin.Context) {
		wm.Disconnect()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "WhatsApp session disconnected",
		})
	})

	// ==========================================
	// OXEV CASHFREE PAYMENT AUTOMATION
	// ==========================================
	r.POST("/api/v1/automation/payment-confirmation", AuthMiddleware(oxevKey, globalKey), func(c *gin.Context) {
		var req PaymentConfirmationReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_PAYLOAD", "message": err.Error()},
			})
			return
		}

		// Calculate Idempotency Key
		idempotencyKey := req.IdempotencyKey
		if idempotencyKey == "" {
			idempotencyKey = "payment-confirmation-" + req.RegistrationID
		}

		// Idempotency Check: Prevent duplicate WhatsApp sends
		var existingLog MessageLog
		if err := db.Where("idempotency_key = ?", idempotencyKey).First(&existingLog).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"status":  "DUPLICATE",
				"message": "Payment confirmation already processed for this registration",
				"data":    existingLog,
			})
			return
		}

		// Fetch Template & Interpolate Variables
		var tmpl MessageTemplate
		templateText := DefaultPaymentTemplate
		if err := db.Where("name = ? AND is_active = ?", "payment_confirmation", true).First(&tmpl).Error; err == nil {
			templateText = tmpl.Content
		}

		vars := map[string]string{
			"student_name":    req.StudentName,
			"event_name":      req.EventName,
			"registration_id": req.RegistrationID,
			"amount":          fmt.Sprintf("%d", req.Amount),
			"payment_id":      req.PaymentID,
		}

		formattedMsg := RenderTemplate(templateText, vars)

		// Create Pending Log Record
		logRecord := MessageLog{
			ID:             uuid.New().String(),
			Phone:          req.Phone,
			StudentName:    req.StudentName,
			EventName:      req.EventName,
			ReferenceID:    req.RegistrationID,
			IdempotencyKey: idempotencyKey,
			MessageContent: formattedMsg,
			Status:         "PENDING",
		}
		db.Create(&logRecord)

		// Dispatch via WhatsApp Engine
		waMsgID, err := wm.SendTextMessage(req.Phone, formattedMsg)
		now := time.Now()

		if err != nil {
			logRecord.Status = "FAILED"
			logRecord.ErrorMessage = err.Error()
			db.Save(&logRecord)

			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"status":  "FAILED",
				"error":   gin.H{"code": "DISPATCH_FAILED", "message": err.Error()},
				"data":    logRecord,
			})
			return
		}

		logRecord.Status = "SENT"
		logRecord.WhatsAppMessageID = waMsgID
		logRecord.SentAt = &now
		db.Save(&logRecord)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"status":  "SENT",
			"message": "WhatsApp confirmation message dispatched successfully",
			"data":    logRecord,
		})
	})

	// ==========================================
	// GENERIC MESSAGE SENDER
	// ==========================================
	r.POST("/api/v1/messages/send", AuthMiddleware(oxevKey, globalKey), func(c *gin.Context) {
		var req DirectMessageReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "INVALID_PAYLOAD", "message": err.Error()}})
			return
		}

		idempotencyKey := req.IdempotencyKey
		if idempotencyKey == "" {
			idempotencyKey = "msg-" + uuid.New().String()
		}

		// Check idempotency
		var existingLog MessageLog
		if err := db.Where("idempotency_key = ?", idempotencyKey).First(&existingLog).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "status": "DUPLICATE", "data": existingLog})
			return
		}

		logRecord := MessageLog{
			ID:             uuid.New().String(),
			Phone:          req.Phone,
			ReferenceID:    req.ReferenceID,
			IdempotencyKey: idempotencyKey,
			MessageContent: req.Message,
			Status:         "PENDING",
		}
		db.Create(&logRecord)

		var waMsgID string
		var err error
		if req.DocumentBase64 != "" {
			waMsgID, err = wm.SendDocumentMessage(req.Phone, req.Message, req.DocumentBase64, req.DocumentName)
		} else {
			waMsgID, err = wm.SendTextMessage(req.Phone, req.Message)
		}
		now := time.Now()

		if err != nil {
			logRecord.Status = "FAILED"
			logRecord.ErrorMessage = err.Error()
			db.Save(&logRecord)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "status": "FAILED", "error": err.Error()})
			return
		}

		logRecord.Status = "SENT"
		logRecord.WhatsAppMessageID = waMsgID
		logRecord.SentAt = &now
		db.Save(&logRecord)

		c.JSON(http.StatusOK, gin.H{"success": true, "status": "SENT", "data": logRecord})
	})

	// ==========================================
	// AUDIT LOGS
	// ==========================================
	r.GET("/api/v1/messages/logs", func(c *gin.Context) {
		var logs []MessageLog
		db.Order("created_at desc").Limit(50).Find(&logs)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": logs})
	})

	// 4. Start Server Gracefully
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		fmt.Printf(" [OK] Server listening on http://localhost:%s\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf(" [ERROR] Server listen error: %v\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println(" [SHUTDOWN] Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
