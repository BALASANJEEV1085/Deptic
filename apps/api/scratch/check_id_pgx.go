package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Unable to connect to database: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	rows, err := conn.Query(context.Background(), "SELECT id FROM scans LIMIT 5")
	if err != nil {
		fmt.Printf("Query failed: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		rows.Scan(&id)
		fmt.Printf("ID: '%s', Length: %d\n", id, len(id))
	}
}
