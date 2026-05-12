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

	rows, _ := db.Query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scans'")
	defer rows.Close()

	for rows.Next() {
		var name, dtype string
		rows.Scan(&name, &dtype)
		fmt.Printf("%s: %s\n", name, dtype)
	}
}
