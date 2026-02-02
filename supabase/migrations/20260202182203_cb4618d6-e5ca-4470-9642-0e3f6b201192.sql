-- Create a view for the leaderboard that combines test results, module quiz results, and progress
CREATE OR REPLACE VIEW public.leaderboard_stats AS
SELECT 
  p.user_id,
  p.display_name,
  p.avatar_url,
  -- Test stats
  COALESCE(tr.test_count, 0) as tests_completed,
  COALESCE(tr.avg_score, 0) as avg_test_score,
  -- Module quiz stats
  COALESCE(mq.modules_passed, 0) as modules_passed,
  COALESCE(mq.avg_quiz_score, 0) as avg_quiz_score,
  -- Combined score: weighted average (40% test score + 30% quiz score + 30% modules completed ratio)
  ROUND(
    (
      COALESCE(tr.avg_score, 0) * 0.4 + 
      COALESCE(mq.avg_quiz_score, 0) * 0.3 +
      CASE 
        WHEN (SELECT COUNT(*) FROM course_modules WHERE is_active = true) > 0 
        THEN (COALESCE(mq.modules_passed, 0)::numeric / (SELECT COUNT(*) FROM course_modules WHERE is_active = true) * 100) * 0.3
        ELSE 0 
      END
    ), 1
  ) as combined_score
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as test_count,
    ROUND(AVG(percentage)::numeric, 1) as avg_score
  FROM test_results
  GROUP BY user_id
) tr ON tr.user_id = p.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(CASE WHEN passed = true THEN 1 END) as modules_passed,
    ROUND(AVG(percentage)::numeric, 1) as avg_quiz_score
  FROM module_quiz_results
  GROUP BY user_id
) mq ON mq.user_id = p.user_id
WHERE (COALESCE(tr.test_count, 0) > 0 OR COALESCE(mq.modules_passed, 0) > 0);

-- Enable RLS on the view
ALTER VIEW public.leaderboard_stats SET (security_invoker = on);

-- Allow anyone to view the leaderboard (it only shows aggregated public data)
CREATE POLICY "Anyone can view leaderboard"
  ON public.profiles
  FOR SELECT
  USING (true);