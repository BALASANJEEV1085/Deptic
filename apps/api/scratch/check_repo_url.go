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

	var repoURL sql.NullString
	db.QueryRow("SELECT repo_url FROM scans LIMIT 1").Scan(&repoURL)
	fmt.Printf("repo_url: '%s'\n", repoURL.String)
}
