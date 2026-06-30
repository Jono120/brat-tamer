-- Link public.users to Supabase Auth (auth.users) and auto-provision profile rows.
--
-- After this migration, Supabase Auth (GoTrue) is the source of truth for identity.
-- public.users.id is no longer self-generated; it equals auth.users.id, so every existing
-- query that filters by users.id / *_user_id keeps working unchanged (the server's JWT `sub`
-- is auth.users.id).
--
-- NOTE: This migration references the Supabase-managed `auth` schema and therefore MUST NOT be
-- loaded by the pg-mem test harness (which has no `auth` schema). Keep 0001 standalone.

-- 1. public.users.id now mirrors auth.users.id (provisioned by the trigger below), so it no
--    longer needs a self-generated default.
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

-- 2. Tie each profile row to an auth user; deleting the auth user cascades to the profile.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fk FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- 3. Auto-create a public.users profile row whenever a new auth user is created (email/password,
--    magic link, Google, Apple, ...). Role defaults to 'user'; admin status is additionally
--    derived at request time from ADMIN_EMAILS on the server, so no DB-side email list is needed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  resolved_email TEXT := COALESCE(NEW.email, 'user-' || NEW.id::text || '@no-email.local');
  resolved_name TEXT := COALESCE(
    NULLIF(meta ->> 'name', ''),
    NULLIF(meta ->> 'full_name', ''),
    NULLIF(meta ->> 'display_name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Friend'
  );
  resolved_photo TEXT := COALESCE(
    NULLIF(meta ->> 'avatar_url', ''),
    NULLIF(meta ->> 'picture', ''),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url, role, has_completed_onboarding)
  VALUES (NEW.id, resolved_email, resolved_name, resolved_photo, 'user', FALSE)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Cutover cleanup: the custom-auth columns are no longer written or read by the server now
--    that Supabase Auth owns credentials and provider identities. Drop them (and their unique
--    constraints). The canonical 0001 schema still defines them for the standalone pg-mem harness;
--    that is fine because those tests do not exercise Supabase Auth.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.users DROP COLUMN IF EXISTS google_sub;
ALTER TABLE public.users DROP COLUMN IF EXISTS apple_sub;
