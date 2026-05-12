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

	rows, _ := db.Query("SELECT id, compliance_score FROM scans WHERE id = '14a2f085-ba4d-4033-b9e5-101ca1f8eae0'")
	defer rows.Close()

	if rows.Next() {
		var id string
		var score int
		rows.Scan(&id, &score)
		fmt.Printf("%s | %d\n", id, score)
	} else {
		fmt.Println("Scan not found")
	}
}
