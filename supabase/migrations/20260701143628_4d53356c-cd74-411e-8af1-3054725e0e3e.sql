
-- Drop broad share-token-existence policies
DROP POLICY IF EXISTS "Anyone can react on shared boards" ON public.board_reactions;
DROP POLICY IF EXISTS "Anyone can read reactions on shared boards" ON public.board_reactions;

-- Ensure anon cannot query the table directly
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.board_reactions FROM anon;

-- Owner SELECT policy already exists; keep it.

-- Token-gated read
CREATE OR REPLACE FUNCTION public.get_shared_reactions(_token uuid)
RETURNS TABLE(id uuid, project_id uuid, item_id uuid, client_id uuid, client_name text, kind text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.project_id, r.item_id, r.client_id, r.client_name, r.kind, r.created_at
  FROM public.board_reactions r
  JOIN public.projects p ON p.id = r.project_id
  WHERE _token IS NOT NULL
    AND p.share_token = _token;
$$;
REVOKE ALL ON FUNCTION public.get_shared_reactions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_reactions(uuid) TO anon, authenticated;

-- Token-gated insert
CREATE OR REPLACE FUNCTION public.insert_shared_reaction(
  _token uuid, _item_id uuid, _client_id uuid, _client_name text, _kind text
)
RETURNS TABLE(id uuid, project_id uuid, item_id uuid, client_id uuid, client_name text, kind text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _project_id uuid;
BEGIN
  SELECT p.id INTO _project_id
  FROM public.projects p
  WHERE _token IS NOT NULL AND p.share_token = _token;
  IF _project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid share token';
  END IF;
  -- Ensure item belongs to that project
  IF NOT EXISTS (SELECT 1 FROM public.moodboard_items m WHERE m.id = _item_id AND m.project_id = _project_id) THEN
    RAISE EXCEPTION 'Item does not belong to this board';
  END IF;
  RETURN QUERY
  INSERT INTO public.board_reactions (project_id, item_id, client_id, client_name, kind)
  VALUES (_project_id, _item_id, _client_id, COALESCE(NULLIF(_client_name, ''), 'Guest'), _kind)
  RETURNING board_reactions.id, board_reactions.project_id, board_reactions.item_id,
            board_reactions.client_id, board_reactions.client_name, board_reactions.kind;
END;
$$;
REVOKE ALL ON FUNCTION public.insert_shared_reaction(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_shared_reaction(uuid, uuid, uuid, text, text) TO anon, authenticated;

-- Token-gated update replaces the old is_project_shared check
CREATE OR REPLACE FUNCTION public.update_my_reaction(_id uuid, _client_id uuid, _kind text, _client_name text, _token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ok integer := 0;
BEGIN
  UPDATE public.board_reactions r
  SET kind = _kind,
      client_name = COALESCE(_client_name, r.client_name),
      updated_at = now()
  WHERE r.id = _id
    AND r.client_id = _client_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = r.project_id AND _token IS NOT NULL AND p.share_token = _token
    );
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.update_my_reaction(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_reaction(uuid, uuid, text, text, uuid) TO anon, authenticated;

-- Drop old signature without token
DROP FUNCTION IF EXISTS public.update_my_reaction(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.delete_my_reaction(_id uuid, _client_id uuid, _token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ok integer := 0;
BEGIN
  DELETE FROM public.board_reactions r
  WHERE r.id = _id
    AND r.client_id = _client_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = r.project_id AND _token IS NOT NULL AND p.share_token = _token
    );
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_reaction(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_reaction(uuid, uuid, uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.delete_my_reaction(uuid, uuid);
