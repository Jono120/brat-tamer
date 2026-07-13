-- Optional free-text note on a sticker log, e.g. what the user is grateful for
-- when completing the "Gratitude moment" daily challenge.
--
-- The column is also present in 0001_initial_schema.sql (canonical schema used by
-- pg-mem, Docker init and fresh installs); IF NOT EXISTS keeps both paths idempotent.
ALTER TABLE sticker_logs ADD COLUMN IF NOT EXISTS note VARCHAR(500);
