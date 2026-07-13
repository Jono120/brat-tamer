-- Security hardening: RLS on remaining tables, stronger group codes, atomic daily challenge rotation.

-- ---------------------------------------------------------------------------
-- RLS for tables previously exposed without policies (defence-in-depth for Data API)
-- ---------------------------------------------------------------------------

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_select_own ON invites
  FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_select_own ON feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY feedback_insert_own ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Longer cryptographically-strong group invite codes (12 hex chars)
-- ---------------------------------------------------------------------------

ALTER TABLE groups ALTER COLUMN invite_code TYPE VARCHAR(12);

-- ---------------------------------------------------------------------------
-- Atomic daily challenge rotation (shared by Express admin route + Edge Function)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rotate_daily_challenge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_id uuid;
  next_id uuid;
  candidate_ids uuid[];
  n int;
  current_idx int;
  next_idx int;
  i int;
BEGIN
  SELECT array_agg(id ORDER BY created_at ASC)
    INTO candidate_ids
    FROM tasks
   WHERE is_global = true;

  n := coalesce(array_length(candidate_ids, 1), 0);
  IF n = 0 THEN
    RETURN jsonb_build_object('ok', true, 'message', 'No global tasks');
  END IF;

  SELECT id INTO current_id
    FROM tasks
   WHERE is_daily_challenge = true AND is_global = true
   LIMIT 1;

  current_idx := -1;
  IF current_id IS NOT NULL THEN
    FOR i IN 1..n LOOP
      IF candidate_ids[i] = current_id THEN
        current_idx := i - 1;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  next_idx := (current_idx + 1) % n;

  UPDATE tasks SET is_daily_challenge = false WHERE is_daily_challenge = true;

  next_id := candidate_ids[next_idx + 1];

  UPDATE tasks SET is_daily_challenge = true WHERE id = next_id;

  RETURN jsonb_build_object(
    'ok', true,
    'previousId', current_id,
    'nextId', next_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_daily_challenge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_daily_challenge() TO service_role;

CREATE OR REPLACE FUNCTION public.set_daily_challenge(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND is_global = true
  ) THEN
    RAISE EXCEPTION 'Daily challenge must be a global task';
  END IF;

  UPDATE tasks SET is_daily_challenge = false WHERE is_daily_challenge = true;
  UPDATE tasks SET is_daily_challenge = true WHERE id = p_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_daily_challenge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_daily_challenge(uuid) TO service_role;
