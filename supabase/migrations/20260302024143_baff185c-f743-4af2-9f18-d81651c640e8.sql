
-- Create app_role enum and user_roles table for secure admin check
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: only admins can read roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update gallery_photos: all authenticated users can view ALL photos (shared gallery)
DROP POLICY IF EXISTS "Users can view their own photos" ON public.gallery_photos;
CREATE POLICY "Authenticated users can view all gallery photos"
ON public.gallery_photos FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert gallery photos
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.gallery_photos;
CREATE POLICY "Admins can insert gallery photos"
ON public.gallery_photos FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete gallery photos
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.gallery_photos;
CREATE POLICY "Admins can delete gallery photos"
ON public.gallery_photos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Make gallery bucket public for reading
UPDATE storage.buckets SET public = true WHERE id = 'gallery';

-- Update storage policies for gallery bucket
DROP POLICY IF EXISTS "Users can view their own gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own gallery files" ON storage.objects;

CREATE POLICY "Anyone can view gallery files"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Admins can upload gallery files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gallery files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

-- Auto-assign admin role to criativelucas@gmail.com on signup
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'criativelucas@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_admin_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_admin_role();

-- Also assign role to existing user if they already exist
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'criativelucas@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
