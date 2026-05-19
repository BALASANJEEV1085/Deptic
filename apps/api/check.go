package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgresql://postgres.pifoeymzjwwungcbxyyl:Bala%40swathi1001@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec(`
		INSERT INTO fix_pull_requests (scan_id, user_id, repo_owner, repo_name, pr_number, pr_url, pr_title, branch_name, status, packages_fixed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, "da0fd2bc-1b37-4548-8dc6-f3205c76e08d", "15d3151b-734c-4742-9ef8-e0413998b5a0", "owner", "repo", 2, "http", "title", "branch", "created", "[]")
	
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Success")
}
