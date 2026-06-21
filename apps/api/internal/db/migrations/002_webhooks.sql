-- Webhook Registrations
CREATE TABLE IF NOT EXISTS webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  github_hook_id BIGINT NOT NULL,
  webhook_secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  auto_scan_branch TEXT DEFAULT 'main',
  scan_on_all_branches BOOLEAN DEFAULT FALSE,
  last_triggered_at TIMESTAMPTZ,
  last_scan_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repo_owner, repo_name)
);
CREATE INDEX ON webhook_registrations(user_id);
CREATE INDEX ON webhook_registrations(repo_owner, repo_name);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_registrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  branch TEXT,
  commit_sha TEXT,
  pusher TEXT,
  scan_id UUID,
  status TEXT DEFAULT 'received',
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON webhook_events(webhook_id);
CREATE INDEX ON webhook_events(received_at DESC);

-- Alter scans table
ALTER TABLE scans ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'manual';
ALTER TABLE scans ADD COLUMN IF NOT EXISTS commit_sha TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'main';
