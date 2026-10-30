BEGIN;

CREATE TABLE public.assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat' CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(messages) = 'array' AND octet_length(messages::text) <= 65536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assistant_conversations_owner_updated
  ON public.assistant_conversations(user_id, updated_at DESC);

CREATE FUNCTION public.assistant_conversation_updated() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_conversations_updated
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.assistant_conversation_updated();

ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_conversations FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.assistant_conversations TO authenticated;
GRANT INSERT (title, messages) ON public.assistant_conversations TO authenticated;
GRANT UPDATE (title, messages) ON public.assistant_conversations TO authenticated;

CREATE POLICY assistant_conversations_read_own
  ON public.assistant_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY assistant_conversations_create_own
  ON public.assistant_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_conversations_update_own
  ON public.assistant_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_conversations_delete_own
  ON public.assistant_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMIT;
