# SCRUM-143 PostGIS search RPCs

Adds two `SECURITY INVOKER` Supabase RPCs:

- `search_listings_in_viewport`: WGS84 envelope + GiST bounding-box prefilter, approval/availability/rent/type/amenity filters, bounded results, min/max rents, and total matching-property count for client map clustering.
- `search_listings_near_landmark`: geography `ST_DWithin` radius search using the same filters and bounded result count.

RLS is not changed by this migration. `SECURITY INVOKER` keeps the existing default-deny table policy effective; public read of approved rows still depends on a reviewed policy such as SCRUM-142. RPC execution is explicitly granted to `anon` and `authenticated`, not PostgreSQL `PUBLIC`.

Local checks:

```sh
node --test scripts/validate_scrum143.mjs
supabase test db --local supabase/tests/search_functions_test.sql
supabase test db --local supabase/tests/audit_log_security_test.sql
```

The SQL tests use synthetic fixtures and roll them back. Fresh local startup applies the migrations in this branch. The SCRUM-143 branch includes the SCRUM-140/141 listings and engagement migrations in its tracked diff; the listings migration is byte-identical to PR #7. The engagement migration is now byte-identical too, including PR #7's `REVOKE TRUNCATE ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated`; `audit_log_security_test.sql` verifies anon/authenticated cannot TRUNCATE the append-only log. The shared profile-helper reorder remains a separate tracked change in this branch and requires independent review/reconciliation. The SCRUM-140/141 owner's separate worktree was not edited.

Run `node scripts/benchmark_scrum143.mjs` with the local Supabase database running to seed 10,000 disposable synthetic properties/units, execute `EXPLAIN ANALYZE`, and roll back. The observed execution time is recorded in the engineering report. The viewport RPC caps results at 500. `cluster_count` reports total matching properties before the cap; aggregation beyond the returned sample remains a client/product decision.