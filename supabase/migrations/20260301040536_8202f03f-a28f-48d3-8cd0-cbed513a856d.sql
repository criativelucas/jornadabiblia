
-- Create gallery_photos table for photo storage metadata
CREATE TABLE public.gallery_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  caption TEXT,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos"
ON public.gallery_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
ON public.gallery_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.gallery_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', false);

CREATE POLICY "Users can upload gallery photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own gallery photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own gallery photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
