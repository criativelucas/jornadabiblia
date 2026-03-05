ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_goal_minutes integer DEFAULT 15;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reading_objective text DEFAULT 'completo';