package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sbom-io/api/internal/compliance"
	"github.com/sbom-io/api/internal/db"
	"github.com/sbom-io/api/internal/scanner"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fmt.Println("DATABASE_URL is required")
		return
	}

	// Simple protocol to avoid PgBouncer errors
	if !contains(dbURL, "default_query_exec_mode=exec") {
		if contains(dbURL, "?") {
			dbURL += "&default_query_exec_mode=exec"
		} else {
			dbURL += "?default_query_exec_mode=exec"
		}
	}

	database, err := sql.Open("pgx", dbURL)
	if err != nil {
		fmt.Printf("Failed to connect: %v\n", err)
		return
	}
	defer database.Close()

	ctx := context.Background()

	// Find all scans with 0 score
	rows, err := database.QueryContext(ctx, "SELECT id, repo_url, ecosystem, created_at FROM scans WHERE compliance_score = 0 OR compliance_score IS NULL")
	if err != nil {
		fmt.Printf("Failed to query scans: %v\n", err)
		return
	}
	defer rows.Close()

	type scanInfo struct {
		ID        string
		RepoURL   string
		Ecosystem string
		CreatedAt time.Time
	}
	var scansToFix []scanInfo
	for rows.Next() {
		var s scanInfo
		var repo, eco sql.NullString
		rows.Scan(&s.ID, &repo, &eco, &s.CreatedAt)
		s.RepoURL = repo.String
		s.Ecosystem = eco.String
		scansToFix = append(scansToFix, s)
	}

	fmt.Printf("Found %d scans to fix compliance metrics for...\n", len(scansToFix))

	for i, s := range scansToFix {
		fmt.Printf("[%d/%d] Fixing %s...\n", i+1, len(scansToFix), s.ID)
		
		_, dbComponents, err := db.GetScanWithComponents(ctx, database, s.ID)
		if err != nil {
			fmt.Printf("  Error fetching components: %v\n", err)
			continue
		}

		var pkgs []scanner.Package
		for _, c := range dbComponents {
			pkgs = append(pkgs, scanner.Package{
				Name:      c.Name,
				Version:   c.Version,
				License:   c.License,
				Ecosystem: c.Ecosystem,
				Depth:     c.Depth,
			})
		}

		repoName := "Unknown Repository"
		if s.RepoURL != "" {
			repoName = s.RepoURL
		}

		sbomMeta := compliance.SBOMMeta{
			AuthorName:  "SBOM.io",
			AuthorTool:  "sbom-io-scanner v1.0.0",
			GeneratedAt: s.CreatedAt,
			RepoName:    repoName,
		}

		ntiaResult := compliance.CheckNTIA(pkgs, sbomMeta)
		euCompliant := compliance.CheckEUCRA(ntiaResult)
		detailBytes, _ := json.Marshal(ntiaResult)

		err = db.UpdateScanCompliance(ctx, database, s.ID, ntiaResult.Score, ntiaResult.Compliant, euCompliant, detailBytes, s.RepoURL, s.Ecosystem)
		if err != nil {
			fmt.Printf("  Error updating DB: %v\n", err)
		} else {
			fmt.Printf("  Success! Score: %d, Compliant: %v\n", ntiaResult.Score, ntiaResult.Compliant)
		}
	}

	fmt.Println("Compliance fix completed.")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s[:len(substr)] == substr || contains(s[1:], substr))
}
