-- Add declined_at column to workspace_invitations
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ DEFAULT NULL;
