package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gomessguii/logger"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"go.mau.fi/whatsmeow"
	"gorm.io/gorm"

	automation_handler "github.com/evolution-foundation/evolution-go/pkg/automation/handler"
	automation_service "github.com/evolution-foundation/evolution-go/pkg/automation/service"
	call_handler "github.com/evolution-foundation/evolution-go/pkg/call/handler"
	call_service "github.com/evolution-foundation/evolution-go/pkg/call/service"
	chat_handler "github.com/evolution-foundation/evolution-go/pkg/chat/handler"
	chat_service "github.com/evolution-foundation/evolution-go/pkg/chat/service"
	community_handler "github.com/evolution-foundation/evolution-go/pkg/community/handler"
	community_service "github.com/evolution-foundation/evolution-go/pkg/community/service"
	config "github.com/evolution-foundation/evolution-go/pkg/config"
	producer_interfaces "github.com/evolution-foundation/evolution-go/pkg/events/interfaces"
	nats_producer "github.com/evolution-foundation/evolution-go/pkg/events/nats"
	rabbitmq_producer "github.com/evolution-foundation/evolution-go/pkg/events/rabbitmq"
	webhook_producer "github.com/evolution-foundation/evolution-go/pkg/events/webhook"
	websocket_producer "github.com/evolution-foundation/evolution-go/pkg/events/websocket"
	group_handler "github.com/evolution-foundation/evolution-go/pkg/group/handler"
	group_service "github.com/evolution-foundation/evolution-go/pkg/group/service"
	instance_handler "github.com/evolution-foundation/evolution-go/pkg/instance/handler"
	instance_model "github.com/evolution-foundation/evolution-go/pkg/instance/model"
	instance_repository "github.com/evolution-foundation/evolution-go/pkg/instance/repository"
	instance_service "github.com/evolution-foundation/evolution-go/pkg/instance/service"
	label_handler "github.com/evolution-foundation/evolution-go/pkg/label/handler"
	label_model "github.com/evolution-foundation/evolution-go/pkg/label/model"
	label_repository "github.com/evolution-foundation/evolution-go/pkg/label/repository"
	label_service "github.com/evolution-foundation/evolution-go/pkg/label/service"
	logger_wrapper "github.com/evolution-foundation/evolution-go/pkg/logger"
	message_handler "github.com/evolution-foundation/evolution-go/pkg/message/handler"
	message_model "github.com/evolution-foundation/evolution-go/pkg/message/model"
	message_repository "github.com/evolution-foundation/evolution-go/pkg/message/repository"
	message_service "github.com/evolution-foundation/evolution-go/pkg/message/service"
	auth_middleware "github.com/evolution-foundation/evolution-go/pkg/middleware"
	newsletter_handler "github.com/evolution-foundation/evolution-go/pkg/newsletter/handler"
	newsletter_service "github.com/evolution-foundation/evolution-go/pkg/newsletter/service"
	passkey_handler "github.com/evolution-foundation/evolution-go/pkg/passkey/handler"
	poll_handler "github.com/evolution-foundation/evolution-go/pkg/poll/handler"
	routes "github.com/evolution-foundation/evolution-go/pkg/routes"
	send_handler "github.com/evolution-foundation/evolution-go/pkg/sendMessage/handler"
	send_service "github.com/evolution-foundation/evolution-go/pkg/sendMessage/service"
	server_handler "github.com/evolution-foundation/evolution-go/pkg/server/handler"
	storage_interfaces "github.com/evolution-foundation/evolution-go/pkg/storage/interfaces"
	minio_storage "github.com/evolution-foundation/evolution-go/pkg/storage/minio"
	template_model "github.com/evolution-foundation/evolution-go/pkg/templates/model"
	template_repository "github.com/evolution-foundation/evolution-go/pkg/templates/repository"
	template_service "github.com/evolution-foundation/evolution-go/pkg/templates/service"
	user_handler "github.com/evolution-foundation/evolution-go/pkg/user/handler"
	user_service "github.com/evolution-foundation/evolution-go/pkg/user/service"
	"github.com/evolution-foundation/evolution-go/pkg/utils"
	whatsmeow_service "github.com/evolution-foundation/evolution-go/pkg/whatsmeow/service"
	amqp "github.com/rabbitmq/amqp091-go"
)

var devMode = flag.Bool("dev", false, "Enable development mode")

var version = "1.0.0-oxis"

func init() {
	if version == "0.0.0" {
		if v, err := os.ReadFile("VERSION"); err == nil {
			if trimmed := strings.TrimSpace(string(v)); trimmed != "" {
				version = trimmed
			}
		}
	}
}

func setupRouter(db *gorm.DB, authDB *sql.DB, sqliteDB *sql.DB, config *config.Config, conn *amqp.Connection, exPath string) *gin.Engine {
	killChannel := make(map[string](chan bool))
	clientPointer := make(map[string]*whatsmeow.Client)

	loggerWrapper := logger_wrapper.NewLoggerManager(config)

	var rabbitmqProducer producer_interfaces.Producer
	if conn != nil {
		logger.LogInfo("RabbitMQ enabled")
		rabbitmqProducer = rabbitmq_producer.NewRabbitMQProducer(
			conn,
			config.AmqpGlobalEnabled,
			config.AmqpGlobalEvents,
			config.AmqpSpecificEvents,
			config.AmqpUrl,
			loggerWrapper,
		)
	} else {
		rabbitmqProducer = rabbitmq_producer.NewRabbitMQProducer(
			nil,
			config.AmqpGlobalEnabled,
			config.AmqpGlobalEvents,
			config.AmqpSpecificEvents,
			config.AmqpUrl,
			loggerWrapper,
		)
	}

	var natsProducer producer_interfaces.Producer
	if config.NatsUrl != "" {
		logger.LogInfo("NATS enabled")
		natsProducer = nats_producer.NewNatsProducer(
			config.NatsUrl,
			config.NatsGlobalEnabled,
			config.NatsGlobalEvents,
			loggerWrapper,
		)
	} else {
		natsProducer = nats_producer.NewNatsProducer(
			"",
			false,
			nil,
			loggerWrapper,
		)
	}

	webhookProducer := webhook_producer.NewWebhookProducer(config.WebhookUrl, loggerWrapper)
	websocketProducer := websocket_producer.NewWebsocketProducer(loggerWrapper)

	if config.AmqpGlobalEnabled && conn != nil {
		logger.LogInfo("Creating global RabbitMQ queues...")
		if err := rabbitmqProducer.CreateGlobalQueues(); err != nil {
			logger.LogError("Failed to create global RabbitMQ queues: %v", err)
		} else {
			logger.LogInfo("Global RabbitMQ queues created successfully")
		}
	}

	var mediaStorage storage_interfaces.MediaStorage
	var err error
	if config.MinioEnabled {
		mediaStorage, err = minio_storage.NewMinioMediaStorage(
			config.MinioEndpoint,
			config.MinioAccessKey,
			config.MinioSecretKey,
			config.MinioBucket,
			config.MinioRegion,
			config.MinioUseSSL,
		)
		if err != nil {
			log.Fatal(err)
		}
	}

	instanceRepository := instance_repository.NewInstanceRepository(db)
	messageRepository := message_repository.NewMessageRepository(db)
	labelRepository := label_repository.NewLabelRepository(db)
	templateRepository := template_repository.NewTemplateRepository(db)
	templateService := template_service.NewTemplateService(templateRepository)

	// Seed built-in templates
	if err := templateService.SeedDefaultTemplates(); err != nil {
		logger.LogWarn("Failed to seed default templates: %v", err)
	}

	whatsmeowService := whatsmeow_service.NewWhatsmeowService(
		instanceRepository,
		authDB,
		messageRepository,
		labelRepository,
		config,
		killChannel,
		clientPointer,
		rabbitmqProducer,
		webhookProducer,
		websocketProducer,
		sqliteDB,
		exPath,
		mediaStorage,
		natsProducer,
		loggerWrapper,
	)
	instanceService := instance_service.NewInstanceService(
		instanceRepository,
		killChannel,
		clientPointer,
		whatsmeowService,
		config,
		loggerWrapper,
	)
	sendMessageService := send_service.NewSendService(clientPointer, whatsmeowService, config, loggerWrapper)
	userService := user_service.NewUserService(clientPointer, whatsmeowService, loggerWrapper)
	messageService := message_service.NewMessageService(clientPointer, messageRepository, whatsmeowService, loggerWrapper)
	chatService := chat_service.NewChatService(clientPointer, whatsmeowService, loggerWrapper)
	groupService := group_service.NewGroupService(clientPointer, whatsmeowService, loggerWrapper)
	callService := call_service.NewCallService(clientPointer, whatsmeowService, loggerWrapper)
	communityService := community_service.NewCommunityService(clientPointer, whatsmeowService, loggerWrapper)
	labelService := label_service.NewLabelService(clientPointer, whatsmeowService, labelRepository, loggerWrapper)
	newsletterService := newsletter_service.NewNewsletterService(clientPointer, whatsmeowService, loggerWrapper)

	pollHandler := poll_handler.NewPollHandler(whatsmeowService.GetPollService(), loggerWrapper)

	// Ensure default OXIS instance exists in database
	defaultInstName := config.DefaultInstanceName
	if defaultInstName == "" {
		defaultInstName = "oxev-main"
	}
	existingInst, _ := instanceRepository.GetInstanceByName(defaultInstName)
	if existingInst == nil {
		newInstance := instance_model.Instance{
			Id:         uuid.New().String(),
			Name:       defaultInstName,
			Token:      utils.GenerateRandomString(32),
			Connected:  false,
			ClientName: "OXIS WhatsApp Automation",
		}
		if _, err := instanceRepository.Create(newInstance); err != nil {
			logger.LogWarn("Could not auto-create default instance '%s': %v", defaultInstName, err)
		} else {
			logger.LogInfo("Auto-created default OXIS WhatsApp instance: %s (ID: %s)", defaultInstName, newInstance.Id)
		}
	}


	// Initialize OXIS-specific services and handlers
	automationService := automation_service.NewAutomationService(
		config,
		instanceRepository,
		messageRepository,
		templateService,
		sendMessageService,
		clientPointer,
		loggerWrapper,
	)
	automationHandler := automation_handler.NewAutomationHandler(automationService)
	oxisInstanceHandler := instance_handler.NewOxisInstanceHandler(
		config,
		instanceRepository,
		instanceService,
		clientPointer,
	)
	oxisMessageHandler := message_handler.NewOxisMessageHandler(
		config,
		instanceRepository,
		messageRepository,
		sendMessageService,
		clientPointer,
		loggerWrapper,
	)

	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Cache-Control, X-Requested-With, apikey, ApiKey, X-API-Key")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(200)
			return
		}
		c.Next()
	})

	// Passkey ceremony routes
	passkey_handler.RegisterRoutes(r, whatsmeowService)

	routes.NewRouter(
		auth_middleware.NewMiddleware(config, instanceService),
		instance_handler.NewInstanceHandler(instanceService, config),
		oxisInstanceHandler,
		oxisMessageHandler,
		automationHandler,
		user_handler.NewUserHandler(userService),
		send_handler.NewSendHandler(sendMessageService),
		message_handler.NewMessageHandler(messageService),
		chat_handler.NewChatHandler(chatService),
		group_handler.NewGroupHandler(groupService),
		call_handler.NewCallHandler(callService),
		community_handler.NewCommunityHandler(communityService),
		label_handler.NewLabelHandler(labelService),
		newsletter_handler.NewNewsletterHandler(newsletterService),
		pollHandler,
		server_handler.NewServerHandler(),
	).AssignRoutes(r)

	if config.ConnectOnStartup {
		go whatsmeowService.ConnectOnStartup(config.ClientName)
	}

	r.GET("/ws", func(c *gin.Context) {
		token := c.Query("token")
		instanceId := c.Query("instanceId")

		if token != config.GlobalApiKey && token != config.OxisGlobalApiKey {
			logger.LogError("Invalid WS token: %s", token)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		websocket_producer.ServeWs(c.Writer, c.Request, instanceId, websocketProducer)
	})

	return r
}

func migrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&instance_model.Instance{},
		&message_model.Message{},
		&label_model.Label{},
		&template_model.MessageTemplate{},
	)

	if err != nil {
		log.Fatal(err)
	}
}

func initAuthDB(config *config.Config) (*sql.DB, string, error) {
	ex, err := os.Executable()
	if err != nil {
		ex = "."
	}
	exPath := filepath.Dir(ex)
	if exPath == "" || exPath == "." {
		exPath, _ = os.Getwd()
	}

	dbDirectory := filepath.Join(exPath, "dbdata")
	_ = os.MkdirAll(dbDirectory, 0755)

	db, err := sql.Open("sqlite", filepath.Join(dbDirectory, "users.db")+"?_pragma=foreign_keys(1)&_busy_timeout=3000")
	if err != nil {
		return nil, "", err
	}

	return db, exPath, nil
}

func initPostgresAuthDB(config *config.Config) (*sql.DB, error) {
	if config.PostgresAuthDB == "" {
		return nil, nil
	}

	_ = config.EnsureDBExists(config.PostgresAuthDB)

	db, err := sql.Open("postgres", config.PostgresAuthDB)
	if err != nil {
		logger.LogWarn("[CONFIG] PostgreSQL AUTH DB connection failed, falling back to local SQLite session store: %v", err)
		return nil, nil
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	err = db.Ping()
	if err != nil {
		logger.LogWarn("[CONFIG] PostgreSQL AUTH DB ping failed, falling back to local SQLite session store: %v", err)
		_ = db.Close()
		return nil, nil
	}

	logger.LogInfo("Connected to PostgreSQL AUTH with connection pool")
	return db, nil
}


// @title OXIS WhatsApp Automation API
// @version 1.0
// @description High-performance WhatsApp Automation REST API for OXIS & OXEV ecosystem
func main() {
	flag.Parse()
	_ = godotenv.Load(".env")


	cfg := config.Load()

	logger.LogInfo("==================================================")
	logger.LogInfo("  OXIS WhatsApp Automation Service v%s", version)
	logger.LogInfo("  Environment: %s", cfg.Environment)
	logger.LogInfo("  Default Instance: %s", cfg.DefaultInstanceName)
	logger.LogInfo("==================================================")

	db, err := cfg.CreateUsersDB()
	if err != nil {
		log.Fatal(err)
	}

	// Initialize PostgreSQL AUTH
	authDB, err := initPostgresAuthDB(cfg)
	if err != nil {
		log.Fatal(err)
	}
	if authDB != nil {
		defer authDB.Close()
	}

	// SQLite auth fallback
	sqliteDB, exPath, err := initAuthDB(cfg)
	if err != nil {
		log.Fatal(err)
	}
	if sqliteDB != nil {
		defer sqliteDB.Close()
	}

	migrate(db)

	var conn *amqp.Connection

	if cfg.AmqpUrl != "" {
		logger.LogInfo("Attempting to connect to RabbitMQ...")
		amqpConfig := amqp.Config{
			Heartbeat: 30 * time.Second,
			Locale:    "en_US",
		}

		conn, err = amqp.DialConfig(cfg.AmqpUrl, amqpConfig)
		if err != nil {
			logger.LogError("Failed to connect to RabbitMQ, err: %v", err)
		} else {
			logger.LogInfo("Successfully connected to RabbitMQ")
			defer func(conn *amqp.Connection) {
				_ = conn.Close()
			}(conn)
		}
	}

	r := setupRouter(db, authDB, sqliteDB, cfg, conn, exPath)

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "8080"
	}


	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.LogInfo("OXIS WhatsApp Automation server listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-quit
	logger.LogInfo("[SHUTDOWN] Signal received, shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.LogError("[SHUTDOWN] Server forced to shutdown: %v", err)
	}

	logger.LogInfo("[SHUTDOWN] Server exited cleanly")
}
