package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/evolution-foundation/evolution-go/docs"
	automation_handler "github.com/evolution-foundation/evolution-go/pkg/automation/handler"
	call_handler "github.com/evolution-foundation/evolution-go/pkg/call/handler"
	chat_handler "github.com/evolution-foundation/evolution-go/pkg/chat/handler"
	community_handler "github.com/evolution-foundation/evolution-go/pkg/community/handler"
	group_handler "github.com/evolution-foundation/evolution-go/pkg/group/handler"
	instance_handler "github.com/evolution-foundation/evolution-go/pkg/instance/handler"
	label_handler "github.com/evolution-foundation/evolution-go/pkg/label/handler"
	message_handler "github.com/evolution-foundation/evolution-go/pkg/message/handler"
	auth_middleware "github.com/evolution-foundation/evolution-go/pkg/middleware"
	newsletter_handler "github.com/evolution-foundation/evolution-go/pkg/newsletter/handler"
	poll_handler "github.com/evolution-foundation/evolution-go/pkg/poll/handler"
	send_handler "github.com/evolution-foundation/evolution-go/pkg/sendMessage/handler"
	server_handler "github.com/evolution-foundation/evolution-go/pkg/server/handler"
	user_handler "github.com/evolution-foundation/evolution-go/pkg/user/handler"
)

type Routes struct {
	authMiddleware          auth_middleware.Middleware
	jidValidationMiddleware *auth_middleware.JIDValidationMiddleware
	instanceHandler         instance_handler.InstanceHandler
	oxisInstanceHandler     instance_handler.OxisInstanceHandler
	oxisMessageHandler      message_handler.OxisMessageHandler
	automationHandler       automation_handler.AutomationHandler
	userHandler             user_handler.UserHandler
	sendHandler             send_handler.SendHandler
	messageHandler          message_handler.MessageHandler
	chatHandler             chat_handler.ChatHandler
	groupHandler            group_handler.GroupHandler
	callHandler             call_handler.CallHandler
	communityHandler        community_handler.CommunityHandler
	labelHandler            label_handler.LabelHandler
	newsletterHandler       newsletter_handler.NewsletterHandler
	pollHandler             *poll_handler.PollHandler
	serverHandler           server_handler.ServerHandler
}

func (r *Routes) AssignRoutes(eng *gin.Engine) {
	// Configuração do CORS
	eng.Use(func(c *gin.Context) {
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

	eng.GET("/swagger", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
	eng.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
	eng.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	eng.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	// Health and Server Status Endpoints
	eng.GET("/health", r.oxisInstanceHandler.Health)
	eng.GET("/server/ok", r.serverHandler.ServerOk)

	// OXIS Interactive Trial Dashboard
	eng.StaticFile("/", "./public/index.html")
	eng.StaticFile("/dashboard", "./public/index.html")
	eng.Static("/public", "./public")

	// Rotas para o gerenciador React (sem autenticação)
	eng.Static("/assets", "./manager/dist/assets")
	eng.GET("/manager/*any", func(c *gin.Context) {
		c.File("manager/dist/index.html")
	})
	eng.GET("/manager", func(c *gin.Context) {
		c.File("manager/dist/index.html")
	})

	// ==========================================
	// OXIS API v1 Routes
	// ==========================================
	v1 := eng.Group("/api/v1")
	{
		// Instance Management
		v1Instance := v1.Group("/instance")
		{
			v1Instance.GET("/status", r.oxisInstanceHandler.GetStatus)
			v1Instance.GET("/qr", r.oxisInstanceHandler.GetQr)

			// Admin protected instance commands
			v1InstanceAdmin := v1Instance.Group("")
			v1InstanceAdmin.Use(r.authMiddleware.AuthAdmin)
			{
				v1InstanceAdmin.POST("/connect", r.oxisInstanceHandler.Connect)
				v1InstanceAdmin.POST("/disconnect", r.oxisInstanceHandler.Disconnect)
				v1InstanceAdmin.DELETE("/logout", r.oxisInstanceHandler.Logout)
			}
		}

		// Direct Internal Message API
		v1Messages := v1.Group("/messages")
		v1Messages.Use(r.authMiddleware.AuthOxevOrAdmin)
		{
			v1Messages.POST("/send", r.oxisMessageHandler.SendMessage)
		}

		// OXEV / OXIS Automation APIs
		v1Automation := v1.Group("/automation")
		v1Automation.Use(r.authMiddleware.AuthOxevOrAdmin)
		{
			v1Automation.POST("/payment-confirmation", r.automationHandler.PaymentConfirmation)
		}
	}

	// ==========================================
	// Backward-Compatible Standard Routes
	// ==========================================
	routes := eng.Group("/instance")
	{
		routes.Use(r.authMiddleware.AuthAdmin)
		{
			routes.POST("/create", r.instanceHandler.Create)
			routes.GET("/all", r.instanceHandler.All)
			routes.GET("/info/:instanceId", r.instanceHandler.Info)
			routes.DELETE("/delete/:instanceId", r.instanceHandler.Delete)
			routes.POST("/proxy/:instanceId", r.instanceHandler.SetProxy)
			routes.DELETE("/proxy/:instanceId", r.instanceHandler.DeleteProxy)
			routes.POST("/forcereconnect/:instanceId", r.instanceHandler.ForceReconnect)
			routes.GET("/logs/:instanceId", r.instanceHandler.GetLogs)
		}
	}

	routes = eng.Group("/instance")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/connect", r.instanceHandler.Connect)
			routes.GET("/status", r.instanceHandler.Status)
			routes.GET("/qr", r.instanceHandler.Qr)
			routes.POST("/pair", r.jidValidationMiddleware.ValidateNumberField(), r.instanceHandler.Pair)
			routes.POST("/disconnect", r.instanceHandler.Disconnect)
			routes.POST("/reconnect", r.instanceHandler.Reconnect)
			routes.DELETE("/logout", r.instanceHandler.Logout)
			routes.GET("/:instanceId/advanced-settings", r.instanceHandler.GetAdvancedSettings)
			routes.PUT("/:instanceId/advanced-settings", r.instanceHandler.UpdateAdvancedSettings)
		}
	}

	routes = eng.Group("/send")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/text", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendText)
			routes.POST("/link", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendLink)
			routes.POST("/media", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendMedia)
			routes.POST("/poll", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendPoll)
			routes.POST("/sticker", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendSticker)
			routes.POST("/location", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendLocation)
			routes.POST("/contact", r.jidValidationMiddleware.ValidateContactFields(), r.sendHandler.SendContact)
			routes.POST("/button", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendButton)
			routes.POST("/list", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendList)
			routes.POST("/carousel", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.sendHandler.SendCarousel)
			routes.POST("/status/text", r.sendHandler.SendStatusText)
			routes.POST("/status/media", r.sendHandler.SendStatusMedia)
		}
	}
	routes = eng.Group("/user")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/info", r.jidValidationMiddleware.ValidateNumberField(), r.userHandler.GetUser)
			routes.POST("/check", r.jidValidationMiddleware.ValidateNumberFieldWithFormatJid(), r.userHandler.CheckUser)
			routes.POST("/avatar", r.jidValidationMiddleware.ValidateNumberField(), r.userHandler.GetAvatar)
			routes.GET("/contacts", r.userHandler.GetContacts)
			routes.GET("/privacy", r.userHandler.GetPrivacy)
			routes.POST("/privacy", r.userHandler.SetPrivacy)
			routes.POST("/block", r.jidValidationMiddleware.ValidateNumberField(), r.userHandler.BlockContact)
			routes.POST("/unblock", r.jidValidationMiddleware.ValidateNumberField(), r.userHandler.UnblockContact)
			routes.GET("/blocklist", r.userHandler.GetBlockList)
			routes.POST("/profilePicture", r.userHandler.SetProfilePicture)
			routes.POST("/profileName", r.userHandler.SetProfileName)
			routes.POST("/profileStatus", r.userHandler.SetProfileStatus)
		}
	}
	routes = eng.Group("/message")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/react", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.React)
			routes.POST("/edit", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.EditMessage)
			routes.POST("/delete", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.DeleteMessageEveryone)
			routes.POST("/markRead", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.MarkRead)
			routes.POST("/markPlayed", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.MarkPlayed)
			routes.POST("/presence", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.ChatPresence)
			routes.POST("/status", r.jidValidationMiddleware.ValidateNumberField(), r.messageHandler.GetMessageStatus)
		}
	}
	routes = eng.Group("/chat")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/archive", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatArchive)
			routes.POST("/unarchive", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatUnarchive)
			routes.POST("/pin", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatPin)
			routes.POST("/unpin", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatUnpin)
			routes.POST("/mute", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatMute)
			routes.POST("/unmute", r.jidValidationMiddleware.ValidateNumberField(), r.chatHandler.ChatUnmute)
		}
	}

	routes = eng.Group("/group")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/create", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.CreateGroup)
			routes.POST("/inviteCode", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.GetGroupInviteLink)
			routes.POST("/join", r.groupHandler.JoinGroupLink)
			routes.POST("/info", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.GetGroupInfo)
			routes.POST("/leave", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.LeaveGroup)
			routes.POST("/update/participants", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.UpdateParticipant)
			routes.POST("/update/name", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.SetGroupName)
			routes.POST("/update/description", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.SetGroupDescription)
			routes.POST("/update/picture", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.SetGroupPhoto)
			routes.POST("/update/settings", r.jidValidationMiddleware.ValidateNumberField(), r.groupHandler.UpdateGroupSettings)
			routes.GET("/all", r.groupHandler.ListGroups)
		}
	}
	routes = eng.Group("/call")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/reject", r.callHandler.RejectCall)
		}
	}
	routes = eng.Group("/community")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/create", r.communityHandler.CreateCommunity)
			routes.POST("/link", r.communityHandler.CommunityAdd)
			routes.POST("/unlink", r.communityHandler.CommunityRemove)
		}
	}
	routes = eng.Group("/label")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/create", r.labelHandler.ChatLabel)
			routes.POST("/edit", r.labelHandler.EditLabel)
			routes.POST("/remove", r.jidValidationMiddleware.ValidateNumberField(), r.labelHandler.ChatUnlabel)
			routes.GET("/all", r.labelHandler.GetLabels)
		}
	}
	routes = eng.Group("/newsletter")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.POST("/create", r.newsletterHandler.CreateNewsletter)
			routes.POST("/follow", r.newsletterHandler.SubscribeNewsletter)
			routes.GET("/info/:jid", r.newsletterHandler.GetNewsletter)
			routes.GET("/all", r.newsletterHandler.ListNewsletter)
		}
	}
	routes = eng.Group("/polls")
	{
		routes.Use(r.authMiddleware.Auth)
		{
			routes.GET("/:pollMessageId/results", r.pollHandler.GetPollResults)
		}
	}

}

func NewRouter(
	authMiddleware auth_middleware.Middleware,
	instanceHandler instance_handler.InstanceHandler,
	oxisInstanceHandler instance_handler.OxisInstanceHandler,
	oxisMessageHandler message_handler.OxisMessageHandler,
	automationHandler automation_handler.AutomationHandler,
	userHandler user_handler.UserHandler,
	sendHandler send_handler.SendHandler,
	messageHandler message_handler.MessageHandler,
	chatHandler chat_handler.ChatHandler,
	groupHandler group_handler.GroupHandler,
	callHandler call_handler.CallHandler,
	communityHandler community_handler.CommunityHandler,
	labelHandler label_handler.LabelHandler,
	newsletterHandler newsletter_handler.NewsletterHandler,
	pollHandler *poll_handler.PollHandler,
	serverHandler server_handler.ServerHandler,
) *Routes {
	return &Routes{
		authMiddleware:          authMiddleware,
		jidValidationMiddleware: auth_middleware.NewJIDValidationMiddleware(),
		instanceHandler:         instanceHandler,
		oxisInstanceHandler:     oxisInstanceHandler,
		oxisMessageHandler:      oxisMessageHandler,
		automationHandler:       automationHandler,
		userHandler:             userHandler,
		sendHandler:             sendHandler,
		messageHandler:          messageHandler,
		chatHandler:             chatHandler,
		groupHandler:            groupHandler,
		callHandler:             callHandler,
		communityHandler:        communityHandler,
		labelHandler:            labelHandler,
		newsletterHandler:       newsletterHandler,
		pollHandler:             pollHandler,
		serverHandler:           serverHandler,
	}
}
