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

	rows, err := db.Query("SELECT user_id, token, updated_at FROM user_github_tokens")
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID, token, updatedAt string
		rows.Scan(&userID, &token, &updatedAt)
		fmt.Printf("Token found: %s, updated_at: %s, token: %s\n", userID, updatedAt, token)
		count++
	}
	fmt.Printf("Total tokens: %d\n", count)
}
