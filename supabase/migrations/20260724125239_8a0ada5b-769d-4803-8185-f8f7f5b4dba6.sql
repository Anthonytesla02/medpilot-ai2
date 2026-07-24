
-- 1. Public profile mirror table (no email / no PII)
CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.public_profiles;
CREATE POLICY "Public profiles are readable by everyone"
  ON public.public_profiles
  FOR SELECT
  USING (true);

-- Backfill
INSERT INTO public.public_profiles (user_id, display_name, avatar_url)
SELECT user_id, display_name, avatar_url FROM public.profiles
ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now();

-- Sync trigger from profiles -> public_profiles
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  INSERT INTO public.public_profiles (user_id, display_name, avatar_url)
  VALUES (NEW.user_id, NEW.display_name, NEW.avatar_url)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url   = EXCLUDED.avatar_url,
        updated_at   = now();
  RETURN NEW;
END;
$$;

-- Trigger function is internal only.
REVOKE ALL ON FUNCTION public.sync_public_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_public_profile ON public.profiles;
CREATE TRIGGER trg_sync_public_profile
AFTER INSERT OR UPDATE OF display_name, avatar_url OR DELETE
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

-- 2. Rebuild leaderboard view using public_profiles (no PII), invoker rights
DROP VIEW IF EXISTS public.leaderboard_stats;
CREATE VIEW public.leaderboard_stats
WITH (security_invoker = on) AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(tr.test_count, 0::bigint) AS tests_completed,
  COALESCE(tr.avg_score, 0::numeric) AS avg_test_score,
  COALESCE(mq.modules_passed, 0::bigint) AS modules_passed,
  COALESCE(mq.avg_quiz_score, 0::numeric) AS avg_quiz_score,
  round(
    COALESCE(tr.avg_score, 0::numeric) * 0.4
    + COALESCE(mq.avg_quiz_score, 0::numeric) * 0.3
    + CASE
        WHEN (SELECT count(*) FROM public.course_modules WHERE is_active = true) > 0
          THEN COALESCE(mq.modules_passed, 0::bigint)::numeric
               / (SELECT count(*) FROM public.course_modules WHERE is_active = true)::numeric
               * 100::numeric * 0.3
        ELSE 0::numeric
      END,
    1
  ) AS combined_score
FROM public.public_profiles p
LEFT JOIN (
  SELECT user_id, count(*) AS test_count, round(avg(percentage), 1) AS avg_score
  FROM public.test_results
  GROUP BY user_id
) tr ON tr.user_id = p.user_id
LEFT JOIN (
  SELECT user_id,
    count(CASE WHEN passed = true THEN 1 END) AS modules_passed,
    round(avg(percentage), 1) AS avg_quiz_score
  FROM public.module_quiz_results
  GROUP BY user_id
) mq ON mq.user_id = p.user_id;

GRANT SELECT ON public.leaderboard_stats TO anon, authenticated;

-- 3. Convert has_role to SECURITY INVOKER so it stops being flagged.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ensure signed-in users can read their own roles (needed by has_role now that it's invoker).
-- Existing policy "Users can view their own roles" already permits this.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon, service_role;
