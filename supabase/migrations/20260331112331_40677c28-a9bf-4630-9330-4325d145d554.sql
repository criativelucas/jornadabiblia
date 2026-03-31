
-- 1. Fix profiles policies: change from 'public' to 'authenticated' role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create own profile" ON public.profiles;
CREATE POLICY "Authenticated users can create own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Fix chapter_tags policies: change from 'public' to 'authenticated'
DROP POLICY IF EXISTS "Users can view own tags" ON public.chapter_tags;
CREATE POLICY "Users can view own tags" ON public.chapter_tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tags" ON public.chapter_tags;
CREATE POLICY "Users can insert own tags" ON public.chapter_tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tags" ON public.chapter_tags;
CREATE POLICY "Users can delete own tags" ON public.chapter_tags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Fix quiz_results policies: change from 'public' to 'authenticated'
DROP POLICY IF EXISTS "quiz_results own read" ON public.quiz_results;
CREATE POLICY "quiz_results own read" ON public.quiz_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_results own insert" ON public.quiz_results;
CREATE POLICY "quiz_results own insert" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Fix avatars bucket: add ownership verification
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Fix handle_new_user search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, streak, longest_streak)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 6. Create quiz_questions_public view without correct_index
CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = on)
AS SELECT id, book_name, question, options FROM public.quiz_questions;

-- 7. Restrict quiz_questions to authenticated only, remove public read
DROP POLICY IF EXISTS "quiz_questions public read" ON public.quiz_questions;
CREATE POLICY "quiz_questions authenticated read" ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);
