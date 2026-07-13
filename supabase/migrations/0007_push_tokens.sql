-- Native / web push notification device tokens (FCM registration tokens, APNs via FCM).
-- Registered by the Express API (privileged role); RLS lets clients read/remove only their own.

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token TEXT NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 1 AND 4096),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX push_tokens_user_id_idx ON push_tokens (user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_tokens_select_own ON push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_tokens_insert_own ON push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_tokens_update_own ON push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_tokens_delete_own ON push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
