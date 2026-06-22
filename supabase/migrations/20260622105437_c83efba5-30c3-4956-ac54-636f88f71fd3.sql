
ALTER TABLE public.board_feedback
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_note text;

-- Column-level grants: anon (share viewers) must never read resolved/internal_note.
REVOKE SELECT ON public.board_feedback FROM anon;
GRANT SELECT
  (id, project_id, item_id, client_id, client_name, body, decision, seen_by_owner, created_at, updated_at)
  ON public.board_feedback TO anon;

-- Authenticated owners keep full access (RLS still scopes rows via is_project_owner).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_feedback TO authenticated;
GRANT ALL ON public.board_feedback TO service_role;
