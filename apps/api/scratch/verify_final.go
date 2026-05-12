package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	conn, _ := pgx.Connect(context.Background(), dbURL)
	defer conn.Close(context.Background())

	var score int
	err := conn.QueryRow(context.Background(), "SELECT compliance_score FROM scans WHERE id = '6c37fd00-c574-4273-b74d-5732aa3e9fc6'").Scan(&score)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	fmt.Printf("Score for 6c37fd00: %d\n", score)
}
