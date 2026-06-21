
CREATE OR REPLACE FUNCTION public.is_project_shared(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND share_token IS NOT NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND user_id = auth.uid()
  );
$function$;

GRANT EXECUTE ON FUNCTION public.is_project_shared(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO anon, authenticated;
