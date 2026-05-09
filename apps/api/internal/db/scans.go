// go get github.com/jackc/pgx/v5
package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sbom-io/api/internal/scanner"
)

// Scan represents a single SBOM scan operation
type Scan struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Component represents a resolved dependency package inside a scan
type Component struct {
	ID          string    `json:"id"`
	ScanID      string    `json:"scan_id"`
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	VersionSpec string    `json:"version_spec"`
	License     string    `json:"license"`
	Ecosystem   string    `json:"ecosystem"`
	Depth       int       `json:"depth"`
	ParentName  string    `json:"parent_name"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateOrGetDefaultProject upserts a default project for the given user and returns its project UUID
func CreateOrGetDefaultProject(ctx context.Context, db *sql.DB, userID string) (projectID string, err error) {
	query := `
		INSERT INTO projects (id, user_id, name, created_at)
		VALUES (gen_random_uuid(), $1, 'Default Project', now())
		ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
		RETURNING id`
	err = db.QueryRowContext(ctx, query, userID).Scan(&projectID)
	if err != nil {
		// If projects table doesn't have user_id unique constraint, try SELECT
		fmt.Printf("Upsert project error: %v — trying SELECT\n", err)
		selErr := db.QueryRowContext(ctx, `SELECT id FROM projects WHERE user_id = $1 LIMIT 1`, userID).Scan(&projectID)
		if selErr != nil {
			// Last resort: insert without ON CONFLICT
			insErr := db.QueryRowContext(ctx, `INSERT INTO projects (id, user_id, name, created_at) VALUES (gen_random_uuid(), $1, 'Default Project', now()) RETURNING id`, userID).Scan(&projectID)
			if insErr != nil {
				fmt.Printf("CreateProject error: %v\n", insErr)
				return "", fmt.Errorf("creating project: %w", insErr)
			}
		}
	}
	return projectID, nil
}

// CreateScan inserts a new scan row with status="running" and returns its UUID
func CreateScan(ctx context.Context, db *sql.DB, projectID string) (scanID string, err error) {
	query := `INSERT INTO scans (id, project_id, status, created_at) VALUES (gen_random_uuid(), $1, 'running', now()) RETURNING id`
	err = db.QueryRowContext(ctx, query, projectID).Scan(&scanID)
	if err != nil {
		fmt.Printf("CreateScan DB error: %v\n", err)
		return "", fmt.Errorf("creating scan: %w", err)
	}
	return scanID, nil
}

// UpdateScanStatus updates the scan status (e.g. "running" | "done" | "failed")
func UpdateScanStatus(ctx context.Context, db *sql.DB, scanID, status string) error {
	query := `UPDATE scans SET status = $1 WHERE id = $2`
	_, err := db.ExecContext(ctx, query, status, scanID)
	if err != nil {
		return fmt.Errorf("updating scan status: %w", err)
	}
	return nil
}

// SaveComponents inserts all resolved packages into the components table in batches of 500
func SaveComponents(ctx context.Context, db *sql.DB, scanID string, packages []scanner.Package) error {
	if len(packages) == 0 {
		return nil
	}

	batchSize := 500
	for i := 0; i < len(packages); i += batchSize {
		end := i + batchSize
		if end > len(packages) {
			end = len(packages)
		}

		batch := packages[i:end]
		if err := insertComponentsBatch(ctx, db, scanID, batch); err != nil {
			return fmt.Errorf("inserting batch starting at %d: %w", i, err)
		}
	}

	return nil
}

// insertComponentsBatch handles the actual bulk insert SQL logic for a single batch
func insertComponentsBatch(ctx context.Context, db *sql.DB, scanID string, batch []scanner.Package) error {
	valueStrings := make([]string, 0, len(batch))
	valueArgs := make([]interface{}, 0, len(batch)*8)

	for i, pkg := range batch {
		baseIdx := i * 8
		// 8 fields per row: scan_id, name, version, version_spec, license, ecosystem, depth, parent_name
		valueStrings = append(valueStrings, fmt.Sprintf("(gen_random_uuid(), $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, now())",
			baseIdx+1, baseIdx+2, baseIdx+3, baseIdx+4, baseIdx+5, baseIdx+6, baseIdx+7, baseIdx+8))
		
		valueArgs = append(valueArgs, scanID, pkg.Name, pkg.Version, pkg.VersionSpec, pkg.License, pkg.Ecosystem, pkg.Depth, pkg.ParentName)
	}

	query := fmt.Sprintf(`
		INSERT INTO components (id, scan_id, name, version, version_spec, license, ecosystem, depth, parent_name, created_at)
		VALUES %s`, strings.Join(valueStrings, ","))

	_, err := db.ExecContext(ctx, query, valueArgs...)
	if err != nil {
		return fmt.Errorf("bulk insert exec failed: %w", err)
	}
	return nil
}

// GetScanWithComponents fetches a scan and all its associated components
func GetScanWithComponents(ctx context.Context, db *sql.DB, scanID string) (scan Scan, components []Component, err error) {
	err = db.QueryRowContext(ctx, `SELECT id, project_id, status, created_at FROM scans WHERE id = $1`, scanID).
		Scan(&scan.ID, &scan.ProjectID, &scan.Status, &scan.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return scan, nil, fmt.Errorf("scan not found")
		}
		return scan, nil, fmt.Errorf("fetching scan: %w", err)
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id, scan_id, name, version, version_spec, license, ecosystem, depth, parent_name, created_at
		FROM components
		WHERE scan_id = $1
		ORDER BY depth ASC, name ASC`, scanID)
	if err != nil {
		return scan, nil, fmt.Errorf("fetching components: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c Component
		if err := rows.Scan(&c.ID, &c.ScanID, &c.Name, &c.Version, &c.VersionSpec, &c.License, &c.Ecosystem, &c.Depth, &c.ParentName, &c.CreatedAt); err != nil {
			return scan, nil, fmt.Errorf("scanning component row: %w", err)
		}
		components = append(components, c)
	}

	if err := rows.Err(); err != nil {
		return scan, nil, fmt.Errorf("iterating component rows: %w", err)
	}

	return scan, components, nil
}
