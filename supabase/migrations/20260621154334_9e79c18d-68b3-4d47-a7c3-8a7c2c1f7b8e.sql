
REVOKE EXECUTE ON FUNCTION public.is_project_shared(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_shared(uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO postgres, service_role;
