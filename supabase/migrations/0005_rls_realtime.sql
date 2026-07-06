-- RLS policies for optional client-direct reads and Supabase Realtime.
-- The Express API still uses a privileged connection; these policies protect
-- direct client access via the anon key + user JWT.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;

-- Users: read own profile; friends can read each other's public fields.
CREATE POLICY users_select_own ON users FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY users_select_friends ON users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_friends uf
    WHERE uf.user_id = auth.uid() AND uf.friend_id = users.id
  )
);

-- Tasks: own tasks + global tasks.
CREATE POLICY tasks_select_own ON tasks FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_global = TRUE);

-- Sticker logs: own logs only.
CREATE POLICY logs_select_own ON sticker_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Interactions: inbox and outbox.
CREATE POLICY interactions_select_own ON interactions FOR SELECT TO authenticated
USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Groups: members and admin.
CREATE POLICY groups_select_member ON groups FOR SELECT TO authenticated
USING (
  admin_id = auth.uid()
  OR auth.uid() = ANY (members)
);

-- Friends list.
CREATE POLICY friends_select_own ON user_friends FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Enable Realtime on key tables.
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE sticker_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
