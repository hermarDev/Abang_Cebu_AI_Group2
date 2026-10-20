# SCRUM-143 PostGIS search RPCs

Adds two `SECURITY INVOKER` Supabase RPCs:

- `search_listings_in_viewport`: WGS84 envelope + GiST bounding-box prefilter, approval/availability/rent/type/amenity filters, bounded results, min/max rents, and total matching-property count for client map clustering.
- `search_listings_near_landmark`: geography `ST_DWithin` radius search using the same filters and bounded result count.

RLS is not changed by this migration. `SECURITY INVOKER` keeps the existing default-deny table policy effective; public read of approved rows still depends on a reviewed policy such as SCRUM-142. RPC execution is explicitly granted to `anon` and `authenticated`, not PostgreSQL `PUBLIC`.

Local checks:

```sh
node --test scripts/validate_scrum143.mjs
supabase test db --local supabase/tests/search_functions_test.sql
```

The SQL test uses synthetic fixtures and rolls them back. The local startup initially failed because pre-existing migration `20260929000001_users_and_profiles.sql` defined `get_current_user_role()` before creating `public.profiles`; that ordering was repaired in this ticket branch by moving both profile-dependent helper functions after profile creation. The isolated SCRUM-143 validation worktree included the SCRUM-140/141 listing and engagement migrations as uncommitted local files so the search migration could be reset and tested. **They are not part of this branch's Git diff and must not be committed from this worktree.** The profile-helper reorder is a separate tracked change in this SCRUM-143 branch; it is not only a local validation copy and must be reviewed and explicitly reconciled before merge. The SCRUM-140/141 owner's independent worktree still fails a fresh reset at the historical profile-helper ordering, before the listing migrations run.

Run `node scripts/benchmark_scrum143.mjs` with the local Supabase database running to seed 10,000 disposable synthetic properties/units, execute `EXPLAIN ANALYZE`, and roll back. The observed execution time is recorded in the engineering report. The viewport RPC caps results at 500. `cluster_count` reports total matching properties before the cap; aggregation beyond the returned sample remains a client/product decision.