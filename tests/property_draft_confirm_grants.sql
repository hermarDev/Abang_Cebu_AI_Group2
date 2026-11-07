BEGIN;
DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.confirm_property_draft_media(uuid,uuid,uuid,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.confirm_property_draft_media(uuid,uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'untrusted role can confirm media';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.confirm_property_draft_media(uuid,uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role cannot confirm media';
  END IF;
  IF has_function_privilege('service_role', 'public.confirm_property_draft_media(uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy confirmation remains executable';
  END IF;
END $$;
ROLLBACK;
