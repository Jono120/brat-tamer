-- CareStickers proof-of-concept seed data (local dev and preview branches).
--
-- Runs after migrations on `supabase db reset` and `supabase db push --include-seed`.
-- Protected production branches skip seed via Supabase GitHub integration — run manually if needed.
--
-- Demo accounts (password for all: password123):
--   admin@carestickers.local  — set ADMIN_EMAILS / VITE_ADMIN_EMAILS to this email for admin UI
--   alice@carestickers.local  — group admin, has friends, sticker history
--   bob@carestickers.local    — group member, social interactions
--
-- Fixed UUIDs keep re-seeds idempotent (ON CONFLICT DO NOTHING).

-- ---------------------------------------------------------------------------
-- Auth users + identities (handle_new_user trigger provisions public.users)
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@carestickers.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin User","display_name":"Admin"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'alice@carestickers.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Chen","display_name":"Alice"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'bob@carestickers.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bob Rivera","display_name":"Bob"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider,
  provider_id,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'email',
    'a0000000-0000-4000-8000-000000000001',
    '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@carestickers.local"}'::jsonb,
    NOW(), NOW(), NOW()
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'email',
    'a0000000-0000-4000-8000-000000000002',
    '{"sub":"a0000000-0000-4000-8000-000000000002","email":"alice@carestickers.local"}'::jsonb,
    NOW(), NOW(), NOW()
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    'email',
    'a0000000-0000-4000-8000-000000000003',
    '{"sub":"a0000000-0000-4000-8000-000000000003","email":"bob@carestickers.local"}'::jsonb,
    NOW(), NOW(), NOW()
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Profile tweaks (trigger-created rows)
-- ---------------------------------------------------------------------------

UPDATE public.users SET
  display_name = 'Admin User',
  role = 'admin',
  has_completed_onboarding = TRUE,
  photo_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

UPDATE public.users SET
  display_name = 'Alice Chen',
  has_completed_onboarding = TRUE,
  photo_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
WHERE id = 'a0000000-0000-4000-8000-000000000002';

UPDATE public.users SET
  display_name = 'Bob Rivera',
  has_completed_onboarding = TRUE,
  photo_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
WHERE id = 'a0000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- Group, friends, tasks, logs, social
-- ---------------------------------------------------------------------------

INSERT INTO public.groups (id, name, admin_id, members, invite_code, created_at)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'Care Crew',
  'a0000000-0000-4000-8000-000000000002',
  ARRAY[
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'a0000000-0000-4000-8000-000000000003'::uuid
  ],
  'CREW01',
  NOW() - INTERVAL '14 days'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.users SET group_id = 'c0000000-0000-4000-8000-000000000001'
WHERE id IN (
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003'
);

INSERT INTO public.user_friends (user_id, friend_id)
VALUES
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (
  id, user_id, title, icon, frequency, created_at, is_global, is_daily_challenge, description, target_count
)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Drink water',
    'droplets',
    'daily',
    NOW() - INTERVAL '30 days',
    TRUE,
    FALSE,
    'Stay hydrated throughout the day',
    8
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Move your body',
    'zap',
    'daily',
    NOW() - INTERVAL '30 days',
    TRUE,
    FALSE,
    'A little movement counts',
    1
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Gratitude moment',
    'heart',
    'daily',
    NOW() - INTERVAL '7 days',
    TRUE,
    TRUE,
    'Name one thing you are grateful for today',
    1
  ),
  (
    'b0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000002',
    'Read 10 pages',
    'book-open',
    'daily',
    NOW() - INTERVAL '10 days',
    FALSE,
    FALSE,
    'Any book counts',
    1
  ),
  (
    'b0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000003',
    'Evening walk',
    'footprints',
    'daily',
    NOW() - INTERVAL '5 days',
    FALSE,
    FALSE,
    'Step outside after dinner',
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sticker_logs (id, user_id, task_id, date, earned_at, count)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000001',
    CURRENT_DATE,
    NOW() - INTERVAL '2 hours',
    3
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    CURRENT_DATE,
    NOW() - INTERVAL '1 hour',
    1
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000004',
    CURRENT_DATE - 1,
    (CURRENT_DATE - 1)::timestamptz + TIME '20:30',
    1
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000003',
    'b0000000-0000-4000-8000-000000000005',
    CURRENT_DATE,
    NOW() - INTERVAL '30 minutes',
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.interactions (id, from_user_id, to_user_id, type, content, timestamp, read)
VALUES
  (
    'e0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000002',
    'high-five',
    NULL,
    NOW() - INTERVAL '3 hours',
    FALSE
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003',
    'message',
    'Great job on your walk today!',
    NOW() - INTERVAL '1 day',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.feedback (id, user_id, user_email, content, type, timestamp, status)
VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000003',
  'bob@carestickers.local',
  'Would love a weekly summary email of stickers earned.',
  'feature',
  NOW() - INTERVAL '2 days',
  'pending'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invites (id, inviter_id, created_at, used)
VALUES (
  'f0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000002',
  NOW() - INTERVAL '5 days',
  FALSE
)
ON CONFLICT (id) DO NOTHING;
