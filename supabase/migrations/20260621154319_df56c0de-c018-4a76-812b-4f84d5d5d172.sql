
-- Helper function: is a project currently shared?
CREATE OR REPLACE FUNCTION public.is_project_shared(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND share_token IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- board_reactions
-- ============================================================
CREATE TABLE public.board_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.moodboard_items(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  client_name text NOT NULL DEFAULT 'Guest',
  kind text NOT NULL CHECK (kind IN ('love','pass')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_reactions TO authenticated;
GRANT ALL ON public.board_reactions TO service_role;

ALTER TABLE public.board_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone on a shared board can read reactions for that board
CREATE POLICY "Anyone can read reactions on shared boards"
ON public.board_reactions FOR SELECT
TO anon, authenticated
USING (public.is_project_shared(project_id));

-- Owners can always read reactions on their boards
CREATE POLICY "Owners can read reactions on their boards"
ON public.board_reactions FOR SELECT
TO authenticated
USING (public.is_project_owner(project_id));

-- Anyone on a shared board can insert reactions for that board
CREATE POLICY "Anyone can react on shared boards"
ON public.board_reactions FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_project_shared(project_id));

-- Anyone on a shared board can toggle/update reactions
CREATE POLICY "Anyone can update reactions on shared boards"
ON public.board_reactions FOR UPDATE
TO anon, authenticated
USING (public.is_project_shared(project_id))
WITH CHECK (public.is_project_shared(project_id));

CREATE POLICY "Anyone can delete reactions on shared boards"
ON public.board_reactions FOR DELETE
TO anon, authenticated
USING (public.is_project_shared(project_id));

CREATE INDEX idx_board_reactions_project ON public.board_reactions(project_id);
CREATE INDEX idx_board_reactions_item ON public.board_reactions(item_id);

CREATE TRIGGER trg_board_reactions_updated
BEFORE UPDATE ON public.board_reactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- board_feedback (comments + decisions)
-- ============================================================
CREATE TABLE public.board_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.moodboard_items(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  client_name text NOT NULL DEFAULT 'Guest',
  body text NOT NULL DEFAULT '',
  decision text CHECK (decision IN ('approve','changes')),
  seen_by_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_feedback TO authenticated;
GRANT ALL ON public.board_feedback TO service_role;

ALTER TABLE public.board_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone on a shared board reads everyone's feedback for that board
CREATE POLICY "Anyone can read feedback on shared boards"
ON public.board_feedback FOR SELECT
TO anon, authenticated
USING (public.is_project_shared(project_id));

CREATE POLICY "Owners can read feedback on their boards"
ON public.board_feedback FOR SELECT
TO authenticated
USING (public.is_project_owner(project_id));

CREATE POLICY "Anyone can leave feedback on shared boards"
ON public.board_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_project_shared(project_id));

-- Owners can mark feedback as seen
CREATE POLICY "Owners can update feedback on their boards"
ON public.board_feedback FOR UPDATE
TO authenticated
USING (public.is_project_owner(project_id))
WITH CHECK (public.is_project_owner(project_id));

CREATE INDEX idx_board_feedback_project ON public.board_feedback(project_id);
CREATE INDEX idx_board_feedback_item ON public.board_feedback(item_id);

CREATE TRIGGER trg_board_feedback_updated
BEFORE UPDATE ON public.board_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
