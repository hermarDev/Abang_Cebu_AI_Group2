\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.resubmit_rejected_property(uuid,uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.resubmit_rejected_property(uuid,uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.resubmit_rejected_property(uuid,uuid,bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'unsafe resubmission remains available to application roles';
  END IF;
END $$;
ROLLBACK;
