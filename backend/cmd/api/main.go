package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/dedata/dedata-backend/config"
	"github.com/dedata/dedata-backend/internal/infrastructure/cache"
	"github.com/dedata/dedata-backend/internal/infrastructure/database"
	dbRepo "github.com/dedata/dedata-backend/internal/infrastructure/database"
	"github.com/dedata/dedata-backend/internal/infrastructure/external"
	"github.com/dedata/dedata-backend/internal/interface/http/handler"
	"github.com/dedata/dedata-backend/internal/interface/http/middleware"
	"github.com/dedata/dedata-backend/internal/interface/http/routes"
	"github.com/dedata/dedata-backend/internal/usecase"
	"github.com/dedata/dedata-backend/internal/worker"
	pkgJWT "github.com/dedata/dedata-backend/pkg/jwt"
	"github.com/dedata/dedata-backend/pkg/logger"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger with config
	if err := logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Server.Env); err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Log startup info
	logger.Info(fmt.Sprintf("Starting %s environment", cfg.Server.Env))

	// Connect to database
	if err := database.Connect(&cfg.Database, logger.GetLogger()); err != nil {
		logger.Fatal(fmt.Sprintf("Failed to connect database: %v", err))
	}
	defer database.Close()

	// Connect to Redis
	if err := cache.Connect(&cfg.Redis, logger.GetLogger()); err != nil {
		logger.Fatal(fmt.Sprintf("Failed to connect redis: %v", err))
	}
	defer cache.Close()

	// Initialize dependencies
	db := database.GetDB()

	// Repositories
	userRepo := dbRepo.NewGormUserRepository(db)
	authRepo := dbRepo.NewGormAuthRepository(db)
	checkinRepo := dbRepo.NewGormCheckInRepository(db)
	profileRepo := dbRepo.NewGormProfileRepository(db)

	// External Clients
	x402Client := external.NewX402Client(cfg.X402.BaseURL, cfg.X402.APIToken, cfg.X402.MerchantID, logger.GetLogger())

	// Initialize blockchain token issuer
	tokenIssuer, err := external.NewBlockchainTokenIssuer(&cfg.Blockchain, logger.GetLogger())
	if err != nil {
		logger.Fatal(fmt.Sprintf("Failed to initialize token issuer: %v", err))
	}
	defer tokenIssuer.Close()

	// JWT Manager
	jwtMgr := pkgJWT.NewJWTManager(&cfg.JWT)

	// Use Cases
	authUseCase := usecase.NewAuthUseCase(authRepo, userRepo, jwtMgr, logger.GetLogger())
	checkinUseCase := usecase.NewCheckInUseCase(checkinRepo, userRepo, x402Client, &cfg.CheckIn, logger.GetLogger())
	userUseCase := usecase.NewUserUseCase(userRepo, profileRepo, checkinRepo)

	// Workers
	checkinWorker := worker.NewCheckinWorker(checkinRepo, userRepo, tokenIssuer, &cfg.CheckIn, logger.GetLogger())

	// Handlers
	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(authUseCase)
	checkinHandler := handler.NewCheckInHandler(checkinUseCase)
	userHandler := handler.NewUserHandler(userUseCase)

	// Set Gin mode
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	r := gin.New()

	// Apply global middleware
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger(logger.GetLogger()))
	r.Use(middleware.CORS())

	// Register API routes
	api := r.Group("/api")
	{
		routes.RegisterHealthRoutes(api, healthHandler)
		routes.RegisterAuthRoutes(api, authHandler, jwtMgr)
		routes.RegisterUserRoutes(api, userHandler, jwtMgr)
		routes.RegisterCheckInRoutes(api, checkinHandler, jwtMgr)
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	logger.Info(fmt.Sprintf("Starting server on %s", addr))

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start checkin worker in background
	go checkinWorker.Run(ctx)

	// Start HTTP server in background
	go func() {
		if err := r.Run(addr); err != nil {
			logger.Fatal(fmt.Sprintf("Failed to start server: %v", err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")
	cancel() // Cancel context to stop worker
}
