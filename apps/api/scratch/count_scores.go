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

	var count int
	db.QueryRow("SELECT count(*) FROM scans WHERE compliance_score > 0").Scan(&count)
	fmt.Printf("Scans with score > 0: %d\n", count)
}
