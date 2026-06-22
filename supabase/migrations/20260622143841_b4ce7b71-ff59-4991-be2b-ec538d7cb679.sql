-- 1) board_feedback: drop broad anon SELECT, route reads through a token-gated RPC.
DROP POLICY IF EXISTS "Anon can read public feedback on shared boards" ON public.board_feedback;
REVOKE SELECT ON public.board_feedback FROM anon;
-- Keep anon INSERT (safe columns only) so visitors can still leave feedback.

CREATE OR REPLACE FUNCTION public.get_shared_feedback(_project_id uuid)
RETURNS TABLE (
  id uuid,
  item_id uuid,
  client_id uuid,
  client_name text,
  body text,
  decision text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.item_id, f.client_id, f.client_name, f.body, f.decision, f.created_at
  FROM public.board_feedback f
  WHERE f.project_id = _project_id
    AND public.is_project_shared(_project_id)
  ORDER BY f.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_feedback(uuid) TO anon, authenticated;

-- 2) moodboard_items: require the share token (not just "any shared project").
DROP POLICY IF EXISTS "Public can view items of shared projects" ON public.moodboard_items;
REVOKE SELECT ON public.moodboard_items FROM anon;

CREATE OR REPLACE FUNCTION public.get_shared_moodboard_items(_token uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  src text,
  caption text,
  tags text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.project_id, m.src, m.caption, m.tags, m.created_at
  FROM public.moodboard_items m
  JOIN public.projects p ON p.id = m.project_id
  WHERE _token IS NOT NULL
    AND p.share_token = _token
  ORDER BY m.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_moodboard_items(uuid) TO anon, authenticated;

-- 3) storage.objects: add an UPDATE policy mirroring DELETE for the moodboard-images bucket.
DROP POLICY IF EXISTS "Users update own moodboard images" ON storage.objects;
CREATE POLICY "Users update own moodboard images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'moodboard-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'moodboard-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );