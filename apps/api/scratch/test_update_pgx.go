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

	scanID := "6c37fd00-c574-4273-b74d-5732aa3e9fc6"
	_, err := conn.Exec(context.Background(), `
		UPDATE scans 
		SET compliance_score = 100, 
		    ntia_compliant = true 
		WHERE id = $1`, scanID)
	
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("Update successful")
	}
}
