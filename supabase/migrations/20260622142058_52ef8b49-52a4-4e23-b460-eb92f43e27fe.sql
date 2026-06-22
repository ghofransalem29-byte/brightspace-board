-- Remove enumeration-prone anon read access
DROP POLICY IF EXISTS "Public can view shared projects" ON public.projects;
REVOKE ALL ON public.projects FROM anon;

-- Token-gated lookup: returns the project ONLY when the caller already has the exact token
CREATE OR REPLACE FUNCTION public.get_shared_project(_token uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  cover text,
  palette text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.description, p.cover, p.palette, p.created_at
  FROM public.projects p
  WHERE _token IS NOT NULL
    AND p.share_token = _token
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_shared_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_project(uuid) TO anon, authenticated;