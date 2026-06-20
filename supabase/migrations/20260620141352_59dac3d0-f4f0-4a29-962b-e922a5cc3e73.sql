ALTER TABLE public.projects ADD COLUMN share_token uuid UNIQUE;

GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.moodboard_items TO anon;

CREATE POLICY "Public can view shared projects"
ON public.projects FOR SELECT
TO anon
USING (share_token IS NOT NULL);

CREATE POLICY "Public can view items of shared projects"
ON public.moodboard_items FOR SELECT
TO anon
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = moodboard_items.project_id AND p.share_token IS NOT NULL));