
REVOKE INSERT ON public.board_feedback FROM authenticated;
GRANT INSERT (project_id, item_id, client_id, client_name, body, decision) ON public.board_feedback TO authenticated;
