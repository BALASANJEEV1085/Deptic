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

	rows, _ := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scans'")
	defer rows.Close()

	for rows.Next() {
		var name string
		rows.Scan(&name)
		fmt.Println(name)
	}
}
