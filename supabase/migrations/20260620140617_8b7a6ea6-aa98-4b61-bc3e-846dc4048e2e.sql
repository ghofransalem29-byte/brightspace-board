
-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Board',
  description TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '#1a1a1a',
  palette TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_id_idx ON public.projects(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects" ON public.projects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Moodboard items table
CREATE TABLE public.moodboard_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moodboard_items_project_idx ON public.moodboard_items(project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moodboard_items TO authenticated;
GRANT ALL ON public.moodboard_items TO service_role;

ALTER TABLE public.moodboard_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own moodboard items" ON public.moodboard_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage RLS for moodboard-images bucket
-- (bucket is created via storage_create_bucket tool)
CREATE POLICY "Users read own moodboard images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own moodboard images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own moodboard images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);
