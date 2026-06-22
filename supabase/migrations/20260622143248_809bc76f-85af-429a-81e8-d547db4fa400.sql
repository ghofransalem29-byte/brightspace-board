-- Restore EXECUTE on plan-status helpers so the app can read Pro status after the recent revokes.
-- Harden is_user_pro to only return true for the calling user (or service role) to avoid leaking
-- other users' plan status to authenticated callers.

CREATE OR REPLACE FUNCTION public.is_user_pro(_user_id uuid, _env text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (_user_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND environment = _env
        AND (
          (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'canceled' AND current_period_end > now())
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_pro(uuid, text) TO authenticated;

-- is_project_owner_pro is used from the public share view to decide whether to show Pro-only
-- presentation. It only returns a boolean about the project's owner, not the owner identity.
GRANT EXECUTE ON FUNCTION public.is_project_owner_pro(uuid, text) TO anon, authenticated;