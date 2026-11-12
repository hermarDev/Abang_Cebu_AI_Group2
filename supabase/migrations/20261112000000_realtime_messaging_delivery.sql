BEGIN;

-- Add rental_messages table to supabase_realtime publication for real-time message delivery
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'rental_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_messages;
    END IF;
  END IF;
END $$;

COMMIT;