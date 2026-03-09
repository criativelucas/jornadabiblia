
CREATE OR REPLACE VIEW public.weekly_ranking
WITH (security_invoker = on)
AS
WITH week_start AS (
  SELECT (date_trunc('week', CURRENT_DATE::timestamp with time zone))::date AS monday
)
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  (count(DISTINCT cd.id) * 10 + COALESCE(sum(qr.bonus_points), 0::bigint)) AS weekly_points,
  count(DISTINCT cd.id) AS chapters_this_week,
  COALESCE(sum(qr.bonus_points), 0::bigint) AS quiz_bonus
FROM public_profiles p
CROSS JOIN week_start ws
LEFT JOIN completed_days cd ON cd.user_id = p.user_id
  AND cd.read_date IS NOT NULL
  AND cd.read_date >= ws.monday
  AND cd.read_date < (ws.monday + 7)
LEFT JOIN quiz_results qr ON qr.user_id = p.user_id
  AND qr.completed_at >= ws.monday::timestamp with time zone
  AND qr.completed_at < (ws.monday + 7)::timestamp with time zone
GROUP BY p.user_id, p.display_name, p.avatar_url
HAVING count(DISTINCT cd.id) > 0 OR COALESCE(sum(qr.bonus_points), 0::bigint) > 0
ORDER BY (count(DISTINCT cd.id) * 10 + COALESCE(sum(qr.bonus_points), 0::bigint)) DESC;
