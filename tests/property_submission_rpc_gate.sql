\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.submit_property_from_draft(uuid,uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.submit_property_from_draft(uuid,uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.submit_property_from_draft(uuid,uuid,bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'incomplete submission remains available to application roles';
  END IF;
END $$;
ROLLBACK;
