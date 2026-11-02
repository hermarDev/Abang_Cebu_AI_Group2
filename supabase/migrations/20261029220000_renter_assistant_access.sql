BEGIN;

DROP POLICY IF EXISTS assistant_conversations_read_own ON public.assistant_conversations;
DROP POLICY IF EXISTS assistant_conversations_create_own ON public.assistant_conversations;
DROP POLICY IF EXISTS assistant_conversations_update_own ON public.assistant_conversations;
DROP POLICY IF EXISTS assistant_conversations_delete_own ON public.assistant_conversations;

CREATE POLICY assistant_conversations_read_own
  ON public.assistant_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.get_current_user_role() = 'renter' AND EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = auth.uid() AND profile.is_suspended = FALSE));
CREATE POLICY assistant_conversations_create_own
  ON public.assistant_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.get_current_user_role() = 'renter' AND EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = auth.uid() AND profile.is_suspended = FALSE));
CREATE POLICY assistant_conversations_update_own
  ON public.assistant_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.get_current_user_role() = 'renter' AND EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = auth.uid() AND profile.is_suspended = FALSE))
  WITH CHECK (user_id = auth.uid() AND public.get_current_user_role() = 'renter' AND EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = auth.uid() AND profile.is_suspended = FALSE));
CREATE POLICY assistant_conversations_delete_own
  ON public.assistant_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.get_current_user_role() = 'renter' AND EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = auth.uid() AND profile.is_suspended = FALSE));

COMMIT;
