package auth_middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/evolution-foundation/evolution-go/pkg/config"
	instance_service "github.com/evolution-foundation/evolution-go/pkg/instance/service"
	"github.com/gin-gonic/gin"
)

type Middleware interface {
	Auth(ctx *gin.Context)
	AuthAdmin(ctx *gin.Context)
	AuthOxevOrAdmin(ctx *gin.Context)
}

type middleware struct {
	config          *config.Config
	instanceService instance_service.InstanceService
}

func extractToken(ctx *gin.Context) string {
	// Check Authorization header (Bearer token)
	authHeader := ctx.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
		return strings.TrimSpace(authHeader)
	}

	// Check apikey / ApiKey header
	if token := ctx.GetHeader("apikey"); token != "" {
		return strings.TrimSpace(token)
	}
	if token := ctx.GetHeader("ApiKey"); token != "" {
		return strings.TrimSpace(token)
	}
	if token := ctx.GetHeader("X-API-Key"); token != "" {
		return strings.TrimSpace(token)
	}

	return ""
}

func constantTimeCompare(a, b string) bool {
	if len(a) == 0 || len(b) == 0 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func (m *middleware) Auth(ctx *gin.Context) {
	token := extractToken(ctx)
	if token == "" {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "API key or Bearer token is missing",
			},
		})
		return
	}

	// If global key is provided, allow access
	if constantTimeCompare(token, m.config.GlobalApiKey) || constantTimeCompare(token, m.config.OxisGlobalApiKey) {
		ctx.Next()
		return
	}

	instance, err := m.instanceService.GetInstanceByToken(token)
	if err != nil || instance == nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid API key or instance not found",
			},
		})
		return
	}

	ctx.Set("instance", instance)
	ctx.Next()
}

func (m *middleware) AuthAdmin(ctx *gin.Context) {
	token := extractToken(ctx)
	if token == "" {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Admin API key is missing",
			},
		})
		return
	}

	if !constantTimeCompare(token, m.config.GlobalApiKey) && !constantTimeCompare(token, m.config.OxisGlobalApiKey) {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid Admin API key",
			},
		})
		return
	}

	ctx.Next()
}

func (m *middleware) AuthOxevOrAdmin(ctx *gin.Context) {
	token := extractToken(ctx)
	if token == "" {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Service authentication token is missing (provide via Authorization: Bearer <KEY> or apikey header)",
			},
		})
		return
	}

	isOxev := constantTimeCompare(token, m.config.OxevServiceApiKey)
	isGlobal := constantTimeCompare(token, m.config.GlobalApiKey) || constantTimeCompare(token, m.config.OxisGlobalApiKey)

	if !isOxev && !isGlobal {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Invalid service authentication credentials",
			},
		})
		return
	}

	ctx.Next()
}

func NewMiddleware(config *config.Config, instanceService instance_service.InstanceService) Middleware {
	return &middleware{config: config, instanceService: instanceService}
}
