package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/deptic-io/api/internal/handlers"
	"github.com/deptic-io/api/internal/vuln"
)

func main() {
	// Attempt to load .env from the monorepo root
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Note: No .env file found or failed to load. Relying on system environment variables.")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required in environment")
	}

	// Disable statement cache to prevent Supabase PgBouncer errors (SQLSTATE 42P05)
	if !strings.Contains(dbURL, "statement_cache_capacity=0") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&statement_cache_capacity=0&default_query_exec_mode=exec"
		} else {
			dbURL += "?statement_cache_capacity=0&default_query_exec_mode=exec"
		}
	}

	// Connect to PostgreSQL via pgx driver
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Successfully connected to the database!")

	// Drop legacy unique constraint on projects.user_id to support multiple projects per user across workspaces
	if _, err := db.Exec(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_key;`); err != nil {
		log.Printf("Warning: failed to drop projects_user_id_key constraint: %v", err)
	}

	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Fatal("REDIS_URL is required in environment")
	}
	redisOpt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Invalid REDIS_URL: %v", err)
	}
	redisClient := redis.NewClient(redisOpt)
	defer redisClient.Close()
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Failed to ping Redis: %v", err)
	}

	app := fiber.New(fiber.Config{
		AppName: "DEPTIC.io API",
		ReadBufferSize: 16384, // Increase buffer size to handle large Supabase auth cookies
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Workspace-ID, X-GitHub-Token",
		ExposeHeaders: "Content-Disposition, X-Deptic-ID, X-Deptic-SHA256, X-Component-Count",
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	// Register API Routes
	api := app.Group("/api")
	vuln.InitResolver(redisClient)
	handlers.RegisterRoutes(api, db, redisClient)
	handlers.RegisterBadgeRoutes(app, api, db)

	// Start server on port 8081
	log.Println("Starting server on port 8081...")
	log.Fatal(app.Listen(":8081"))
}
