package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sbom-io/api/internal/db"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	database, _ := sql.Open("pgx", dbURL)
	defer database.Close()

	scanID := "07f755fb-097d-411a-826c-d944e9903c53"
	
	// Try to update it using the same logic as the app
	err := db.UpdateScanCompliance(context.Background(), database, scanID, 95, true, true, []byte("{}"), "https://github.com/expressjs/express", "npm")
	
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("Update successful")
	}
}
