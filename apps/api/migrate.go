package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := "postgresql://postgres.pifoeymzjwwungcbxyyl:Bala%40swathi1001@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?statement_cache_capacity=0&default_query_exec_mode=exec"
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS user_github_tokens (
			user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
			token TEXT NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("Migration completed successfully")
}
