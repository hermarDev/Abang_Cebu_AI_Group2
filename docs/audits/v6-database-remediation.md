# V6 database remediation review

Timestamp: 2026-10-24 20:58 PHT / 12:58 UTC.
Target: Supabase project `oekihxgobdsxeqgotfsh`.
Status: **PROPOSAL ONLY / NOT APPLIED. Production release NO-GO.**

## Evidence and boundaries

Schema-only Management API queries inspected trigger bindings/enabled state, function definitions, constraints, grants and policies. No application rows were read, no Auth users registered, and no hosted DDL/DML applied. Local CLI linking was configuration only. No verified recoverable backup or disposable-database validation is available. V6 section 0B keeps auth-trigger/security changes proposal-only; broad `/yolo` authority does not waive those gates.

## Confirmed defects

### Signup provisioning collision

`auth.users` has two enabled (`tgenabled = O`) row-level AFTER INSERT triggers:

- `finder_auth_signup` calls `public.finder_new_user()`.
- `on_auth_user_created` calls `public.handle_new_user()`.

Both function bodies unconditionally insert `NEW.id` into `public.profiles`. `profiles_pkey` is PRIMARY KEY (id). With ordinary trigger execution, the second insert conflicts and aborts signup. This is catalog/source evidence, not a live signup reproduction.

Do not blindly remove the older trigger: its function also provisions `avatar_url` and `bio`, while the Finder function bounds names and sanitizes phone metadata. A consolidated provisioner must preserve intended optional metadata and renter/landlord allowlisting; arbitrary admin metadata must never grant admin. Do not add `ON CONFLICT DO NOTHING` to both functions as a superficial fix: that makes behavior depend on trigger ordering and leaves duplicate provisioning paths.

### Cross-profile reads

Verified profile policies:

| Name | Command | Roles | USING | WITH CHECK |
| --- | --- | --- | --- | --- |
| Public profiles are viewable by everyone | SELECT | public | true | none |
| finder_profile_read | SELECT | authenticated | id = auth.uid() | none |
| Admins have full access to profiles | ALL | public | is_admin() | is_admin() |
| Users can update own profile | UPDATE | public | auth.uid() = id | own ID plus comparisons to stored role/is_suspended |
| finder_profile_update | UPDATE | authenticated | own ID and NOT is_suspended | own ID and NOT is_suspended |

Authenticated SELECT grants include `phone_number`. Permissive policies combine with OR; the broad true policy defeats self-only SELECT. Anonymous grants were not established; do not report confirmed anonymous phone exposure. No profile email column or public auth.users email access was established.

The overlapping UPDATE policies also require isolated review: one policy's checks cannot be assumed to constrain another permissive policy. Existing restricted column grants may prevent role/suspension writes, but row-policy composition and suspended-account updates need direct synthetic tests. Do not claim those invariants passed from SELECT inspection.

### Migration drift

Remote history lists the September migrations; local `20261023000000_finder_schema.sql` was not recorded applied even though Finder objects exist remotely. The local bootstrap uses unconditional object creation. Do not run `db push` or repair migration history merely because table names exist. Compare definitions, constraints, grants, functions and policies first.

## Smallest remediation direction (not approved SQL)

1. Capture exact schema-only definitions, function owners/ACLs, dependent callers, trigger enabled state and effective grants. Retain checksums privately without user rows or credentials.
2. Reconcile one canonical signup provisioner preserving intended avatar/bio fields, bounded full names, optional valid phone, and anti-admin escalation. Remove only the redundant trigger after isolated compatibility tests. This is an auth/security change requiring its own approval and safeguards.
3. Remove the broad profile SELECT policy only after validating the existing self-read and admin paths. Preserve self-read `role,is_suspended` used by `src/lib/auth/sign-in.ts`. Do not widen grants or expose private fields through a public projection.
4. Independently validate UPDATE policy composition; narrow it only against verified role/suspension and column-grant requirements.
5. Reconcile migration history separately after complete schema equivalence review. Never edit previously applied migrations in place.

DEV's initial draft is rejected for execution: its policy guard expected `public.is_admin()` while the live catalog renders `is_admin()`, and its trigger removal did not resolve avatar/bio compatibility. No executable repair has been placed in `supabase/migrations/`.

## Required acceptance gates

- Verified recoverable backup/PITR and a restore rehearsal appropriate to this exact target/change.
- Disposable schema matching the observed hybrid baseline, not only the local bootstrap.
- Synthetic signup creates exactly one profile; missing/long names, optional avatar/bio/phone, renter/landlord and attempted admin metadata behave safely.
- Own-profile login lookup succeeds; another authenticated identity cannot read private profile data; anonymous denial checked separately.
- Admin access remains intentional; suspended identity updates denied; role/suspension escalation denied at both policy and grant boundaries.
- Existing listings/favorites/KYC constraints and negative authorization checks remain intact.
- Transactional forward script has exact preconditions, bounded lock timeout and postconditions; rollback rehearsed against the same baseline.
- Rollback that recreates duplicate triggers or broad profile access restores known defects. Prefer rollback-before-commit on validation failure; any post-commit restoration of unsafe access requires an explicit incident decision.
- Independent security review, exact script checksum and separate migration-history decision before any hosted operation.

## Release decision

Database change: **NOT APPLIED**. Isolated migration tests: **NOT RUN**. Backup recoverability: **NOT VERIFIED**. Live signup: **NOT RUN intentionally**. These are release blockers, not evidence that UI work should be reverted. Continue safe UI verification independently.
