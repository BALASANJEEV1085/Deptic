CREATE TABLE IF NOT EXISTS fix_pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url TEXT NOT NULL,
    pr_title TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    packages_fixed JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fix_pull_requests_scan_id_idx
    ON fix_pull_requests (scan_id, created_at DESC);
