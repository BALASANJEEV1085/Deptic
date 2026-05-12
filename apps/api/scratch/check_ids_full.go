package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	db, _ := sql.Open("pgx", dbURL)
	defer db.Close()

	rows, _ := db.Query("SELECT id, compliance_score FROM scans ORDER BY created_at DESC LIMIT 5")
	defer rows.Close()

	for rows.Next() {
		var id string
		var score int
		rows.Scan(&id, &score)
		fmt.Printf("%s | %d\n", id, score)
	}
}
