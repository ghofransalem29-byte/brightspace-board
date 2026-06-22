-- Restrict anon SELECT on board_feedback to safe columns only
DROP POLICY IF EXISTS "Anyone can read feedback on shared boards" ON public.board_feedback;

-- Recreate read policy for anon only (authenticated owners covered by existing owner policy)
CREATE POLICY "Anon can read public feedback on shared boards"
ON public.board_feedback
FOR SELECT
TO anon
USING (is_project_shared(project_id));

-- Strip blanket grants, then re-grant only non-sensitive columns to anon
REVOKE ALL ON public.board_feedback FROM anon;
GRANT SELECT (id, project_id, item_id, client_id, client_name, body, decision, created_at, updated_at)
  ON public.board_feedback TO anon;
GRANT INSERT (project_id, item_id, client_id, client_name, body, decision)
  ON public.board_feedback TO anon;

-- Ensure authenticated/service still work normally
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_feedback TO authenticated;
GRANT ALL ON public.board_feedback TO service_role;