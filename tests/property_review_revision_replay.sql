\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
DO $$
DECLARE p uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
        op uuid := 'cccccccc-0000-4000-8000-000000000001';
        d uuid := 'dddddddd-0000-4000-8000-000000000001';
BEGIN
  PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 1);
  PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 1);
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', NULL, NULL);
    RAISE EXCEPTION 'missing revision accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 2);
    RAISE EXCEPTION 'changed revision accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', 'dddddddd-0000-4000-8000-000000000002', 1);
    RAISE EXCEPTION 'changed draft accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
ROLLBACK;
