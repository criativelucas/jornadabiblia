
-- Add streak and profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_date text,
ADD COLUMN IF NOT EXISTS unlocked_milestones integer[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_verse_shown_date text,
ADD COLUMN IF NOT EXISTS selected_plan text NOT NULL DEFAULT '6months',
ADD COLUMN IF NOT EXISTS plan_start_date text;

-- Add plan_id to completed_days for multi-plan support
ALTER TABLE public.completed_days 
ADD COLUMN IF NOT EXISTS plan_id text NOT NULL DEFAULT '6months';

-- Make comments private per user (requirement #6)
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Users can view own comments" ON public.comments FOR SELECT USING (auth.uid() = user_id);

-- Chapter tags table
CREATE TABLE IF NOT EXISTS public.chapter_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  chapter_key text NOT NULL,
  tag text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_key, tag)
);

ALTER TABLE public.chapter_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON public.chapter_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.chapter_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.chapter_tags FOR DELETE USING (auth.uid() = user_id);
