
-- 1) Tighten board_reactions: drop public UPDATE/DELETE policies; use RPCs that verify client_id
DROP POLICY IF EXISTS "Anyone can delete reactions on shared boards" ON public.board_reactions;
DROP POLICY IF EXISTS "Anyone can update reactions on shared boards" ON public.board_reactions;

CREATE OR REPLACE FUNCTION public.delete_my_reaction(_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  DELETE FROM public.board_reactions r
  WHERE r.id = _id
    AND r.client_id = _client_id
    AND public.is_project_shared(r.project_id);
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_reaction(_id uuid, _client_id uuid, _kind text, _client_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  UPDATE public.board_reactions r
  SET kind = _kind,
      client_name = COALESCE(_client_name, r.client_name),
      updated_at = now()
  WHERE r.id = _id
    AND r.client_id = _client_id
    AND public.is_project_shared(r.project_id);
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_reaction(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_reaction(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_reaction(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_reaction(uuid, uuid, text, text) TO anon, authenticated;

-- 2) Switch existing helper functions to SECURITY INVOKER so direct calls can't bypass RLS
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_project_shared(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND share_token IS NOT NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_user_pro(_user_id uuid, _env text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND environment = _env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_project_owner_pro(_project_id uuid, _env text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_user_pro(p.user_id, _env)
  FROM public.projects p
  WHERE p.id = _project_id;
$function$;
