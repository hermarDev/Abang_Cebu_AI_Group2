-- A draft revision can be submitted once, even under different operation IDs.
BEGIN;
CREATE UNIQUE INDEX property_submissions_draft_revision_unique
  ON public.property_submissions (draft_id, expected_revision);
COMMIT;
