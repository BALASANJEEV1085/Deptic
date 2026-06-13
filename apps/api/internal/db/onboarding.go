package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type UserPreferences struct {
	UserID                 string
	OnboardingCompleted    bool
	OnboardingSkipped      bool
	HeardAboutFrom         *string
	JobRole                *string
	CompanyName            *string
	UseCase                *string
	OnboardingCompletedAt  *time.Time
	UserCreatedAt          time.Time
}

func GetUserPreferences(ctx context.Context, db *sql.DB, userID string) (*UserPreferences, error) {
	var p UserPreferences
	var heard, role, company, useCase sql.NullString
	var completedAt sql.NullTime

	err := db.QueryRowContext(ctx, `
		SELECT
			COALESCE(up.onboarding_completed, false),
			COALESCE(up.onboarding_skipped, false),
			up.heard_about_from,
			up.job_role,
			up.company_name,
			up.use_case,
			up.onboarding_completed_at,
			u.created_at
		FROM auth.users u
		LEFT JOIN user_preferences up ON up.user_id = u.id
		WHERE u.id = $1
	`, userID).Scan(
		&p.OnboardingCompleted,
		&p.OnboardingSkipped,
		&heard,
		&role,
		&company,
		&useCase,
		&completedAt,
		&p.UserCreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("GetUserPreferences: %w", err)
	}

	p.UserID = userID
	if heard.Valid {
		p.HeardAboutFrom = &heard.String
	}
	if role.Valid {
		p.JobRole = &role.String
	}
	if company.Valid {
		p.CompanyName = &company.String
	}
	if useCase.Valid {
		p.UseCase = &useCase.String
	}
	if completedAt.Valid {
		p.OnboardingCompletedAt = &completedAt.Time
	}

	return &p, nil
}

func UpsertOnboarding(ctx context.Context, db *sql.DB, userID string, skipped bool, heard, role, company, useCase *string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO user_preferences (
			user_id, onboarding_completed, onboarding_skipped,
			heard_about_from, job_role, company_name, use_case,
			onboarding_completed_at, updated_at
		) VALUES ($1, true, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			onboarding_completed = true,
			onboarding_skipped = EXCLUDED.onboarding_skipped,
			heard_about_from = COALESCE(EXCLUDED.heard_about_from, user_preferences.heard_about_from),
			job_role = COALESCE(EXCLUDED.job_role, user_preferences.job_role),
			company_name = COALESCE(EXCLUDED.company_name, user_preferences.company_name),
			use_case = COALESCE(EXCLUDED.use_case, user_preferences.use_case),
			onboarding_completed_at = NOW(),
			updated_at = NOW()
	`, userID, skipped, heard, role, company, useCase)
	if err != nil {
		return fmt.Errorf("UpsertOnboarding: %w", err)
	}
	return nil
}

func UpdateUserProfile(ctx context.Context, db *sql.DB, userID string, role, company *string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO user_preferences (user_id, job_role, company_name, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			job_role = COALESCE(EXCLUDED.job_role, user_preferences.job_role),
			company_name = COALESCE(EXCLUDED.company_name, user_preferences.company_name),
			updated_at = NOW()
	`, userID, role, company)
	if err != nil {
		return fmt.Errorf("UpdateUserProfile: %w", err)
	}
	return nil
}
