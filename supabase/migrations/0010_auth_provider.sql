-- Track how each user authenticates: 'email' (email/password) or a third-party
-- OAuth provider ('google', 'apple', ...).
--
-- SECURITY NOTE: passwords are intentionally NOT stored in public.users. Supabase Auth
-- (GoTrue) owns credentials: email/password users get a bcrypt hash in
-- auth.users.encrypted_password, and OAuth users have no password at all (their
-- identities live in auth.identities). public.users only records the provider so app
-- logic can branch (e.g. hide "change password" UI for google/apple users).
--
-- The column is also present in 0001_initial_schema.sql (canonical schema used by
-- pg-mem, Docker init and fresh installs); IF NOT EXISTS keeps both paths idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';

-- Backfill existing rows from the auth metadata GoTrue writes on signup
-- (raw_app_meta_data is server-controlled, unlike user-editable raw_user_meta_data).
UPDATE public.users u
SET auth_provider = COALESCE(NULLIF(a.raw_app_meta_data ->> 'provider', ''), 'email')
FROM auth.users a
WHERE a.id = u.id;

-- Provision auth_provider for new signups (email/password, magic link, Google, Apple, ...).
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
  resolved_provider TEXT := COALESCE(
    NULLIF(COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) ->> 'provider', ''),
    'email'
  );
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url, role, has_completed_onboarding, auth_provider)
  VALUES (NEW.id, resolved_email, resolved_name, resolved_photo, 'user', FALSE, resolved_provider)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
