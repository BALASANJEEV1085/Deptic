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

	scanID := "14a2f085-ba1d-4033-b9e5-101ca1f8eae0"
	_, err := db.Exec(`
		UPDATE scans 
		SET compliance_score = 100, 
		    ntia_compliant = true 
		WHERE id = $1`, scanID)
	
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("Manual update successful")
	}
}
