-- 1. Restrict profiles SELECT to own user only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Create a narrow public view for weekly ranking to access display_name/avatar_url
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
  SELECT user_id, display_name, avatar_url FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. Recreate weekly_ranking view using public_profiles instead of profiles directly
CREATE OR REPLACE VIEW public.weekly_ranking AS
WITH week_start AS (
  SELECT date_trunc('week', CURRENT_DATE)::date AS monday
)
SELECT
  p.user_id, p.display_name, p.avatar_url,
  (COUNT(DISTINCT cd.id) * 10 + COALESCE(SUM(qr.bonus_points), 0))::bigint AS weekly_points,
  COUNT(DISTINCT cd.id)::bigint AS chapters_this_week,
  COALESCE(SUM(qr.bonus_points), 0)::bigint AS quiz_bonus
FROM public_profiles p
CROSS JOIN week_start ws
LEFT JOIN completed_days cd
       ON cd.user_id = p.user_id
      AND cd.read_date IS NOT NULL
      AND cd.read_date >= ws.monday
      AND cd.read_date  < ws.monday + 7
LEFT JOIN quiz_results qr
       ON qr.user_id = p.user_id
      AND qr.completed_at >= ws.monday::timestamptz
      AND qr.completed_at  < (ws.monday + 7)::timestamptz
GROUP BY p.user_id, p.display_name, p.avatar_url
HAVING COUNT(DISTINCT cd.id) > 0 OR COALESCE(SUM(qr.bonus_points), 0) > 0
ORDER BY weekly_points DESC;