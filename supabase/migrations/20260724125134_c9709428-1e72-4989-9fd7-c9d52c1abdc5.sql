
-- 1. Drop overly-permissive public policy on profiles
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.profiles;

-- 2. Rebuild leaderboard_stats view without security_invoker so it can read
-- only the non-PII columns of profiles regardless of caller. Explicitly no email.
DROP VIEW IF EXISTS public.leaderboard_stats;
CREATE VIEW public.leaderboard_stats
WITH (security_invoker = off) AS
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
FROM public.profiles p
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

-- 3. Lock down SECURITY DEFINER helpers so they aren't publicly callable.
-- Trigger functions never need EXECUTE from clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;

-- admin_exists is only needed at bootstrap; restrict to service_role.
REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO service_role;

-- has_role must remain callable by signed-in users (used in RLS policies),
-- but revoke from anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
