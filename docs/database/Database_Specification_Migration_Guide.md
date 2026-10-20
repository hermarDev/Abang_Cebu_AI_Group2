# Database specification and SQL migration workflow

## Scope and source of truth

`Database_Specification.xlsx` is a data dictionary, not executable SQL. The reviewed Supabase migration files in `supabase/migrations/` define how a fresh project builds the schema. Review a candidate migration and run it on an isolated local Supabase project before deployment. Never execute this guide against production as a test.

The attached SCRUM-146 workbook was extracted from a read-only local PostgreSQL 15.8 catalog. It documents the exact catalog queried, not production. Its migration provenance identifies two base migrations from `main` and listing/search migrations from unmerged PR #7 and PR #6 revisions. Refresh the workbook after those migrations are reconciled and merged; do not silently present that local catalog as canonical production state.

## Fresh local replay

From the repository root, with Docker and Supabase CLI installed:

```sh
supabase start
supabase migration list --local
supabase db lint --local --schema public --fail-on error
```

`supabase start` initializes local Supabase services and applies the committed local migrations when it provisions its database. On the candidate feature branch reviewed for this workbook, clean replay applied the two base migrations, listing/engagement migration files and the amenity seed from open PR #7, and search functions from open PR #6. The amenity seed migration is part of PR #7, but it is absent from the local applied ledger captured in the attached workbook. Apply it in a subsequent forward replay when synchronizing that ledger. The tracked `supabase/seed.sql` is only a placeholder. Do not imply the local migration ledger includes a file it has not applied. Use an isolated project/ports if another local Supabase stack is already running; never stop or reset a different project to resolve a port collision. Inspect migration status and catalog counts afterward. Stop only the isolated project created for this validation when finished.

To recreate an existing disposable local database from all migrations, `supabase db reset --local` drops/recreates that local database and reapplies the migrations and seed. It is destructive: confirm the selected project is disposable and yours before running it. Never use `--linked` or a production URL for replay tests.

## Migration authoring rules

- Add schema changes as new forward-only files named `supabase/migrations/<UTC timestamp>_<description>.sql`.
- Order dependencies explicitly: extensions/types, parent tables, dependent tables, functions/triggers, policies, then seed/reference data where applicable.
- Prefer transactional DDL (`BEGIN`/`COMMIT`) where PostgreSQL operation semantics allow; design idempotency intentionally, and use new compensating migrations rather than editing an already-applied migration.
- Keep demo/test fixtures separate from migrations and do not include real or sample credentials.
- Review RLS, grants, function security/search paths, FK delete behavior, and PostGIS/extension dependencies before applying.
- Review changes from unmerged feature branches and resolve overlaps before including them in a consolidated migration set.
- A successful clean local replay proves the committed migration set ran in that local environment only. It does not prove production parity, staging acceptance, or deployment.

## Workbook refresh

Capture a read-only migration ledger and PostgreSQL catalog on the explicitly named baseline. Regenerate the workbook from `docs/templates/Database_Specification_Template.xlsx` after applying migrations; compare ordered columns/types/defaults/nullability, keys, constraints, indexes, relationships, RLS, policies, triggers, enums and functions. Record database identity, applied migration versions, source revisions/hashes, and limitations in the workbook. Do not put connection credentials or row data into the artifact.

The workbook is wide and may span many printed pages. Set print scaling and repeat header rows according to the repository template before using the PDF as a review artifact; the XLSX remains the primary deliverable.
