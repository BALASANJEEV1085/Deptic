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

	rows, _ := db.Query("SELECT id FROM scans LIMIT 5")
	defer rows.Close()

	for rows.Next() {
		var id string
		rows.Scan(&id)
		fmt.Printf("ID: '%s', Length: %d\n", id, len(id))
	}
}
