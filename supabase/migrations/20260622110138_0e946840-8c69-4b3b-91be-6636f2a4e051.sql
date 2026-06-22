
-- 1) Column-level grants: anon may only read display columns.

REVOKE SELECT ON public.projects FROM anon;
GRANT SELECT (id, title, description, cover, palette, created_at, updated_at, share_token)
  ON public.projects TO anon;

REVOKE SELECT ON public.moodboard_items FROM anon;
GRANT SELECT (id, project_id, src, caption, tags, created_at)
  ON public.moodboard_items TO anon;

-- Ensure authenticated owners keep full access; RLS still scopes rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moodboard_items TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.moodboard_items TO service_role;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER helpers (only used inside RLS).
REVOKE EXECUTE ON FUNCTION public.is_project_shared(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_owner_pro(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_user_pro(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- delete_my_reaction / update_my_reaction stay callable: share visitors (anon) use them.
