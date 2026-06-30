-- CareStickers canonical schema (app tables only).
--
-- This file is the single source of truth for the application tables. It is loaded by:
--   * Supabase CLI (`supabase db push` / `supabase db reset`)
--   * the pg-mem test harness (server/test/createPgMemPool.ts)
--   * the optional server-side auto-migrate (server/src/db.ts initSchema)
--   * the local Docker Postgres init mount (docker-compose.yml)
--
-- It deliberately references NO Supabase-managed objects (e.g. auth.users) so it can be
-- applied standalone by pg-mem. Auth linking lives in 0002_auth_link.sql.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL,
  password_hash TEXT,
  display_name VARCHAR(100) NOT NULL,
  photo_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'group-admin')),
  theme VARCHAR(10) CHECK (theme IN ('light', 'dark')),
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  google_sub VARCHAR(255),
  apple_sub VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_google_sub_unique UNIQUE (google_sub),
  CONSTRAINT users_apple_sub_unique UNIQUE (apple_sub)
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  admin_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  members UUID[] NOT NULL DEFAULT '{}',
  invite_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT groups_invite_code_unique UNIQUE (invite_code)
);

ALTER TABLE users ADD COLUMN group_id UUID REFERENCES groups (id) ON DELETE SET NULL;

CREATE TABLE user_friends (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT user_friends_no_self CHECK (user_id <> friend_id)
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(64) NOT NULL,
  frequency VARCHAR(16) NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  color VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  is_daily_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  description VARCHAR(500),
  target_count INT CHECK (target_count IS NULL OR target_count >= 1)
);

CREATE INDEX idx_tasks_user ON tasks (user_id);
CREATE INDEX idx_tasks_global ON tasks (is_global) WHERE is_global = TRUE;

CREATE TABLE sticker_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL,
  count INT DEFAULT 1 CHECK (count IS NULL OR count >= 1)
);

CREATE INDEX idx_logs_user_date ON sticker_logs (user_id, date);
CREATE INDEX idx_logs_user ON sticker_logs (user_id);

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL CHECK (type IN ('high-five', 'message')),
  content TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_interactions_to ON interactions (to_user_id);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_email VARCHAR(320) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(16) NOT NULL CHECK (type IN ('feature', 'issue')),
  timestamp TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed'))
);
