package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var token string
	err = db.QueryRow("SELECT token FROM shared_links LIMIT 1").Scan(&token)
	if err != nil {
		log.Fatal("No token found")
	}
	fmt.Println("Token:", token)
}
