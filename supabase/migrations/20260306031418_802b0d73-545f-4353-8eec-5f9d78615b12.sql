ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_time text DEFAULT '08:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription jsonb DEFAULT null;