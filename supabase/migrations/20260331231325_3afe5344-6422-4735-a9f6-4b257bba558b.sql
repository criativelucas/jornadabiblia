CREATE TABLE IF NOT EXISTS public.strongs_translations (
  strongs_num text PRIMARY KEY,
  def_pt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.strongs_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations" ON public.strongs_translations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert translations" ON public.strongs_translations FOR INSERT TO authenticated WITH CHECK (true);