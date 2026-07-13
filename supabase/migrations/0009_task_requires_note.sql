-- Admin-controlled flag: tasks with requires_note prompt the user for a note
-- (e.g. what they are grateful for) before the sticker is earned.
--
-- The column is also present in 0001_initial_schema.sql (canonical schema used by
-- pg-mem, Docker init and fresh installs); IF NOT EXISTS keeps both paths idempotent.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_note BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: the gratitude challenge previously prompted based on its title.
UPDATE tasks SET requires_note = TRUE WHERE title ILIKE '%gratitude%';
