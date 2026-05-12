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

	rows, err := db.Query("SELECT id, compliance_score, ntia_compliant FROM scans ORDER BY created_at DESC LIMIT 10")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer rows.Close()

	fmt.Println("ID | Score | Compliant")
	for rows.Next() {
		var id string
		var score sql.NullInt64
		var compliant sql.NullBool
		rows.Scan(&id, &score, &compliant)
		fmt.Printf("%s | %v | %v\n", id[:8], score.Int64, compliant.Bool)
	}
}
