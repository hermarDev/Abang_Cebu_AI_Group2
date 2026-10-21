# Sprint 3 Closeout and Carry-over Report

**Prepared:** 2026-10-21 (PST) — revised after independent review of PRs #6, #7, #9, #11, and #12
**Project:** Abang Cebu AI (`SCRUM`)
**Board:** SCRUM board (ID 1)
**Sprint:** Sprint 3 (ID 72)
**Prepared by:** Hermar L. Centillas Jr.

## Executive summary

Sprint 3 remains active (scheduled through 2026-11-02 13:00 UTC). A fresh live Jira sprint-issues query returned 35 issues. At this verified snapshot: **8 Done, 24 IN DEVELOPMENT, 0 IN REVIEW, 2 READY, 1 BLOCKED**; therefore, 27 issues remain not Done. An active sprint is not a declaration of acceptance or completion.

This is an evidence-based closeout draft, not a completed sprint review or declaration that the sprint is complete. No staging demonstration was verified. The team retrospective was not run and no participant feedback was collected. Do not close Sprint 3 or mark unfinished issues Done until their acceptance evidence exists, or the user explicitly chooses to close with honest carry-over.

## Sprint metadata and reconciliation

- Sprint 3: **active**; scheduled 2026-10-19 00:54 UTC to 2026-11-02 13:00 UTC. Live `jira_get_sprints(boardId=1, state='active')` returns Sprint 3 active.
- Inventory: 35; the live sprint issue endpoint and project-scoped JQL both returned 35 keys. Reconciled status arithmetic: 8 Done + 24 IN DEVELOPMENT + 0 IN REVIEW + 2 READY + 1 BLOCKED = 35. Direct issue reads also confirm SCRUM-145 IN DEVELOPMENT, SCRUM-146 Done, SCRUM-160 Done, and SCRUM-168 IN DEVELOPMENT.
- All 35 returned issues have an assignee.
- Jira comment history confirms the sprint had been closed at the user's request and then reopened. Closing a sprint moved incomplete issues to backlog in the earlier lifecycle action; it did not resolve or finish them.

## Complete Jira issue register

The following are live sprint endpoint statuses and current assignees, not proof that each acceptance criterion passed. [Jira Sprint 3](https://abangcebuai.atlassian.net/issues/?jql=sprint%20%3D%2072)

| Key | Summary | Status | Assignee |
|---|---|---|---|
| [SCRUM-135](https://abangcebuai.atlassian.net/browse/SCRUM-135) | Set up GitHub Actions CI pipeline (tsc, lint, build) | Done | Hermar centillas |
| [SCRUM-137](https://abangcebuai.atlassian.net/browse/SCRUM-137) | Define IAM least-privilege roles and policies for staging | IN DEVELOPMENT | Edrich Bardilas |
| [SCRUM-138](https://abangcebuai.atlassian.net/browse/SCRUM-138) | IAM access review and security audit of staging | Done | Edrich Bardilas |
| [SCRUM-141](https://abangcebuai.atlassian.net/browse/SCRUM-141) | Implement engagement tables migration (inquiries, saved_listings, reviews, audit_logs) | IN DEVELOPMENT | Dency Marie Bosque |
| [SCRUM-140](https://abangcebuai.atlassian.net/browse/SCRUM-140) | Implement core listing tables migration | IN DEVELOPMENT | Dency Marie Bosque |
| [SCRUM-134](https://abangcebuai.atlassian.net/browse/SCRUM-134) | Provision AWS EC2 staging environment for Next.js app | IN DEVELOPMENT | Michelle Estoy |
| [SCRUM-142](https://abangcebuai.atlassian.net/browse/SCRUM-142) | Apply Row Level Security policies as migrations | IN DEVELOPMENT | Michelle Estoy |
| [SCRUM-143](https://abangcebuai.atlassian.net/browse/SCRUM-143) | Create PostGIS search functions (viewport bbox and landmark radius) | IN DEVELOPMENT | Hermar centillas |
| [SCRUM-144](https://abangcebuai.atlassian.net/browse/SCRUM-144) | Seed Metro Cebu landmarks and sample listings | READY | Dency Marie Bosque |
| [SCRUM-145](https://abangcebuai.atlassian.net/browse/SCRUM-145) | Configure Supabase Storage buckets and database backups | IN DEVELOPMENT | Dency Marie Bosque |
| [SCRUM-146](https://abangcebuai.atlassian.net/browse/SCRUM-146) | Complete Database Specification workbook (.xlsx) | Done | Dency Marie Bosque |
| [SCRUM-147](https://abangcebuai.atlassian.net/browse/SCRUM-147) | Implement sign-up and email verification (PKCE) | IN DEVELOPMENT | John Lloyd Ando |
| [SCRUM-149](https://abangcebuai.atlassian.net/browse/SCRUM-149) | Implement logout and multi-tab sign-out sync | IN DEVELOPMENT | junrilldisoy90 |
| [SCRUM-148](https://abangcebuai.atlassian.net/browse/SCRUM-148) | Implement login, session refresh and Remember Me | IN DEVELOPMENT | Neah Moneva |
| [SCRUM-152](https://abangcebuai.atlassian.net/browse/SCRUM-152) | Implement standard API error contract and auth error handling | IN DEVELOPMENT | junrilldisoy90 |
| [SCRUM-153](https://abangcebuai.atlassian.net/browse/SCRUM-153) | Build shared UI component library (Tailwind v4 tokens) | IN DEVELOPMENT | Angel Crushein Yaun |
| [SCRUM-154](https://abangcebuai.atlassian.net/browse/SCRUM-154) | Implement login, registration and password reset pages | IN DEVELOPMENT | Angel Crushein Yaun |
| [SCRUM-155](https://abangcebuai.atlassian.net/browse/SCRUM-155) | Implement MapLibre map canvas with Metro Cebu viewport and Locate Me | Done | Hermar centillas |
| [SCRUM-151](https://abangcebuai.atlassian.net/browse/SCRUM-151) | Implement RBAC middleware and route guards | IN DEVELOPMENT | Joan Marie Encallado Inting |
| [SCRUM-156](https://abangcebuai.atlassian.net/browse/SCRUM-156) | Implement landing page, search bar and landmark auto-suggest | BLOCKED | Hermar centillas |
| [SCRUM-157](https://abangcebuai.atlassian.net/browse/SCRUM-157) | Implement filter pills, URL state sync and results drawer | IN DEVELOPMENT | Hermar centillas |
| [SCRUM-158](https://abangcebuai.atlassian.net/browse/SCRUM-158) | Module 6: AI Rental Assistant Flowcharts and Specification | Done | Edrich Bardilas |
| [SCRUM-159](https://abangcebuai.atlassian.net/browse/SCRUM-159) | Define AI assistant API contract, prompt policy and evaluation set | Done | Edrich Bardilas |
| [SCRUM-161](https://abangcebuai.atlassian.net/browse/SCRUM-161) | Review and close Sprint 2 carry-over (SCRUM-125, 126, 127) | Done | Hermar centillas |
| [SCRUM-150](https://abangcebuai.atlassian.net/browse/SCRUM-150) | Implement password reset and recovery | IN DEVELOPMENT | Joan Marie Encallado Inting |
| [SCRUM-160](https://abangcebuai.atlassian.net/browse/SCRUM-160) | Extend Function Specification Document with Modules 3 to 5 | Done | Edrich Bardilas |
| [SCRUM-162](https://abangcebuai.atlassian.net/browse/SCRUM-162) | Execute authentication test plan against staging | READY | Jenny Villamor |
| [SCRUM-136](https://abangcebuai.atlassian.net/browse/SCRUM-136) | Automate deployment from main to EC2 staging | IN DEVELOPMENT | Michelle Estoy |
| [SCRUM-163](https://abangcebuai.atlassian.net/browse/SCRUM-163) | Execute RBAC and route guard tests | IN DEVELOPMENT | Karla Hiyas |
| [SCRUM-164](https://abangcebuai.atlassian.net/browse/SCRUM-164) | Browser, mobile and usability testing of auth pages and map UI | IN DEVELOPMENT | Anne KC M. Casinay |
| [SCRUM-166](https://abangcebuai.atlassian.net/browse/SCRUM-166) | Execute k6 load tests on staging (steady-state and burst) | IN DEVELOPMENT | Ryza Albiso |
| [SCRUM-165](https://abangcebuai.atlassian.net/browse/SCRUM-165) | Write test plans for Modules 3, 4 and 5 | IN DEVELOPMENT | Jenny Villamor |
| [SCRUM-139](https://abangcebuai.atlassian.net/browse/SCRUM-139) | Set up monitoring, logging and uptime alerts for staging | IN DEVELOPMENT | Michelle Estoy |
| [SCRUM-167](https://abangcebuai.atlassian.net/browse/SCRUM-167) | System test plan and first end-to-end run (auth to map to listing) | IN DEVELOPMENT | Karla Hiyas |
| [SCRUM-168](https://abangcebuai.atlassian.net/browse/SCRUM-168) | Sprint 3 review, retrospective and reporting | IN DEVELOPMENT | Hermar centillas |

## Verified delivery evidence and blockers

All PR details below are a dated evidence snapshot (2026-10-21); recheck current head, reviews, and checks before merge decisions.

**Current exact Jira status counts:** 8 Done, 24 IN DEVELOPMENT, 0 IN REVIEW, 2 READY, 1 BLOCKED (35 total; 27 not Done). The 35 issue rows above are the live sprint endpoint inventory.

Repository: [`hermarDev/Abang_Cebu_AI_Group2`](https://github.com/hermarDev/Abang_Cebu_AI_Group2), verified from the local `origin` remote.

- [PR #7 — SCRUM-140/141](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/7), reviewed head `25fe87492b164438b29bb9f3b82f42b9770a43af`: OPEN, merge state CLEAN; CI and secret scan pass; Supabase Preview skipped; no formal review decision. Independent read-only review found SCRUM-140’s “availability enum” criterion conflicts with the boolean field documented in the detailed ERD; reconcile before sign-off. Generated types include `latitude`/`longitude` as writable insert/update properties despite their generated columns in SQL. The 34-assertion suite is declared in-source, but `db reset`/pgTAP were not rerun in that review at this head. SCRUM-141 has favorite uniqueness, indexes, FK deletion behavior, and append-only guards; service-role TRUNCATE privilege not probed in that review. Jira notes separately report a clean reset ordering fix at `4b0eeb1` outside this PR head; coordinate exact migration order/reset validation. No formal review was submitted because the authorization tool denied it.
- [PR #6 — SCRUM-143](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/6), reviewed head `c64e8a08a247799131597d5f39f21a1aee79fa50`: OPEN, merge state CLEAN; CI and secret scan pass; Supabase Preview skipped; no formal review decision. Static source confirms SECURITY INVOKER functions with approved/available predicates and spatial filters. The attached validation file records 23/23 pgTAP and a 55.934 ms 10k benchmark from an earlier validation; these were not rerun in the independent review. Live anon/authenticated role probes failed with permission denied for properties/rental_units, so RPC client use remains BLOCKED on the SCRUM-142 access contract.
- [PR #9 — SCRUM-157](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/9), reviewed head `8e5f1531d6f040b3ef9564c798c23bcd9aadbb99`: OPEN, merge state CLEAN; CI and secret scan pass; Supabase Preview skipped; no formal review decision. URL filter helpers and isolated drawer highlight handlers exist, but MapCanvas hardcodes the ListingSearchAdapter to `null`, so the app cannot show real results or exercise live card-to-pin behavior. Filter value vocabulary also needs explicit mapping to backend/search catalog values. Local tests/browser checks were not rerun in the independent review.
- Other PR state is out of this targeted acceptance review; refresh before relying on prior report snapshots. For PRs #6/#7/#9, automated CI and secret-scan success are not formal approval or SQL/browser acceptance evidence.

### Infrastructure, IAM, and staging

- SCRUM-134 is IN DEVELOPMENT, assigned to Michelle. Acceptance requires a working HTTPS staging URL, redeployable runbook, and proof server-only secrets do not reach browser. No URL/demo evidence was found in the reviewed ticket comments/repository. Staging/demo, deployment, monitoring and staging-dependent QA are NOT VERIFIED.
- SCRUM-137 is IN DEVELOPMENT, assigned to Edrich. Latest Jira comments describe an IAM proposal with resource placeholders; read-only `iam:ListGroups` and `ec2:DescribeInstances` returned AccessDenied. No AWS policy deployment or live allow/deny tests are evidenced.
- SCRUM-144 is READY, assigned to Dency. Its comment says seed data depends on unmerged schema PR #7; do not duplicate the seed or create accounts from real credentials.
- SCRUM-145 is IN DEVELOPMENT, assigned to Dency. This session observed an active isolated local Supabase verification process in `/home/hrmr/Abang_Cebu_AI_Group2-scrum145`; no Jira status or assignee change was made here. Recheck its verified storage-policy and restore results after that work completes; do not infer acceptance from process activity alone.
- SCRUM-162 is READY, assigned to Jenny. Latest previously inspected Jira comment reports 0/100 scenarios executed and no available staging, and lists unresolved case scope/doc contradictions. No staging run was performed. Never use sample credentials from docs.
- [SCRUM-168](https://abangcebuai.atlassian.net/browse/SCRUM-168) is IN DEVELOPMENT, assigned to Hermar. Jira attachment 10520 is the latest uploaded report (16,545 bytes); it was uploaded before the latest independent review identified stale issue statuses and incomplete carry-over decisions. The corrected PR branch/report is being refreshed; no Jira transition or sprint-lifecycle change was made.

### Search, QA and remaining issue scope

- SCRUM-156 is BLOCKED. Jira history documents its marker/search integration dependency on SCRUM-142/143 and an open product clarification over USC campuses/pin/radius. Confirm latest blocker before unblocking.
- SCRUM-157 is IN DEVELOPMENT. Unit/build/CI evidence does not meet live search/card-to-pin acceptance; independent review and integration gates remain.
- SCRUM-160 is Done, assigned to Edrich. Jira attachment 10507 is a Modules 3–5 FSD; a prior review inspected ten function specs, document package, and PDF render. This cycle did not re-open or revalidate that attachment.
- [SCRUM-146](https://abangcebuai.atlassian.net/browse/SCRUM-146) is Done, assigned to Dency. Jira attachment 10518 (39,065 bytes) and PR #12 contain the revised workbook, covering 11 tables/100 column names against its pinned candidate migrations. Independent review found formatting/readability issues in the rendered 27-page PDF, a builder-path bug (`docs/database/build_database_specification.py` resolves template/output under the wrong nested `docs/database/docs` path), substring-based column-note mapping errors, and that the test script is not run in CI. PR #12 remains open, without formal review; the Jira Done state applies to the attached workbook deliverable but is not evidence PR #12 is reviewed/merged or schema is on main/production. Attachment bytes were not available for comparison.
- SCRUM-163 is IN DEVELOPMENT, assigned to Karla. The visible latest Jira comment states 0/63 cases run; it reports middleware/staging dependencies and test-matrix contradictions. Attachment 10506 is a workbook (11,508 bytes); the connector returned metadata, not workbook bytes, so the 63-row contents are not independently verified. Keep execution NOT RUN until actual results are inspected and tested.
- SCRUM-162 is READY, assigned to Jenny. The checked-in `docs/testing/auth-test-plan.md` has 100 unique TC IDs (25 registration, 25 login, 15 reset, 15 sign-out, 10 security, 10 error handling) but labels its execution phase “Pending Feature Development (Sprint 2 Execution)” and includes Pending Dev cells. Jira returned no attachments for SCRUM-162. The scenario execution criterion remains NOT RUN; no staging run is evidenced here.
- SCRUM-165 is IN DEVELOPMENT, assigned to Jenny. Jira attachments 10503 (XLSX, 17,217 bytes) and 10505 (PDF, 38,934 bytes) exist; the binary endpoint provides only a download URL, and this audit did not download/inspect them. SCRUM-125/126/127 are Done specification/flowchart tickets, not execution proof. Criterion-to-case mapping is NOT VERIFIED until the case workbook is opened and compared to their criteria.
- SCRUM-164 is IN DEVELOPMENT, assigned to Anne. Jira attachment 10498 is a PDF (19,788 bytes); content and browser matrix execution were not inspected in this review. No test result is claimed.
- SCRUM-166 is IN DEVELOPMENT, assigned to Ryza. Jira attachment 10502 is a PDF (15,544 bytes); content was not inspected and no reproducible executed k6 result was verified here. The ticket’s staging load targets remain NOT VERIFIED.
- SCRUM-167 is IN DEVELOPMENT, assigned to Karla. The latest detailed Jira update (Oct 20) reports the plan drafted but execution/report NOT DONE, 0/6 staging scenarios run and no bugs logged; no attachment was returned. Treat its dependency list as author-reported, not current revalidation. Staging E2E acceptance is NOT RUN.
- Other Sprint 3 tickets not individually audited against current artifacts in this report: SCRUM-134, SCRUM-136, SCRUM-137, SCRUM-139, SCRUM-144, SCRUM-147, SCRUM-148, SCRUM-149, SCRUM-150, SCRUM-151, SCRUM-152, SCRUM-153, SCRUM-154, SCRUM-156. Their Jira statuses are not acceptance evidence.

### Sprint 4 future backlog

A live project-scoped query returned 13 READY issues in Sprint 4 (ID 73). These are future backlog entries, not a decision to place any Sprint 3 unfinished issue there. SCRUM-168 requires an explicit carry-over list; issue-level disposition has not been agreed or changed. The 13-item Sprint 4 query covers the listing MVP and does not establish complete coverage of the ticket wording “listing management, admin, AI assistant build.”

- [SCRUM-171](https://abangcebuai.atlassian.net/browse/SCRUM-171) — Landlord listing draft forms (Angel Crushein Yaun)
- [SCRUM-172](https://abangcebuai.atlassian.net/browse/SCRUM-172) — Save and submit listing actions (John Lloyd Ando)
- [SCRUM-173](https://abangcebuai.atlassian.net/browse/SCRUM-173) — Integrate listing persistence (Dency Marie Bosque)
- [SCRUM-174](https://abangcebuai.atlassian.net/browse/SCRUM-174) — Protect landlord listing data (Michelle Estoy)
- [SCRUM-175](https://abangcebuai.atlassian.net/browse/SCRUM-175) — Guard landlord listing routes (Joan Marie Encallado Inting)
- [SCRUM-176](https://abangcebuai.atlassian.net/browse/SCRUM-176) — Listing units and photo editor (Neah Moneva)
- [SCRUM-177](https://abangcebuai.atlassian.net/browse/SCRUM-177) — Listing action error contract (junrilldisoy90)
- [SCRUM-178](https://abangcebuai.atlassian.net/browse/SCRUM-178) — Publish approved listings to map (Hermar centillas)
- [SCRUM-179](https://abangcebuai.atlassian.net/browse/SCRUM-179) — Test landlord listing workflow (Jenny Villamor)
- [SCRUM-180](https://abangcebuai.atlassian.net/browse/SCRUM-180) — Check listing usability on devices (Anne KC M. Casinay)
- [SCRUM-181](https://abangcebuai.atlassian.net/browse/SCRUM-181) — Attack listing ownership boundaries (Karla Hiyas)
- [SCRUM-182](https://abangcebuai.atlassian.net/browse/SCRUM-182) — Measure listing search baseline (Ryza Albiso)
- [SCRUM-222](https://abangcebuai.atlassian.net/browse/SCRUM-222) — Trace listing acceptance criteria (Edrich Bardilas)

## SCRUM-168 review / retrospective status

- All-member acceptance review: PARTIAL. This review covered selected PR-backed issues and SCRUM-146; the 35-ticket register is not a criterion-by-criterion review of all assignees’ tickets.
- Staging demonstration: NOT VERIFIED; no staging URL/demo evidence.
- Team retrospective: NOT RUN; no participant feedback was collected. Do not invent findings or attribute opinions.
- Sprint 4: 13 READY issues exist, but the query is a listing-MVP backlog snapshot. No issue-level Sprint 3 carry-over placement was verified; no Sprint 4 membership changes were made. The report therefore does not yet provide the required explicit carry-over disposition or demonstrate complete coverage of admin and AI-assistant build scope.
- PR #11 review: the independent audit at prior head `0859a69257a15593e95f13dbd44e2e10a44ad0c7` found stale 6/24/1/3/1 counts and outdated SCRUM-145/146/160 rows. This branch corrects those rows and the current count, but SCRUM-168 acceptance is still incomplete. PR #11 is not formally reviewed.
- Jira status remains IN DEVELOPMENT; no issue transition, assignee change, or sprint lifecycle change was made.


## Safe next actions

1. Obtain explicit handoffs for any assigned active branch/worktree before code takeover; preserve all existing assignees and work. This report work is on a dedicated docs PR branch.
2. SCRUM-140/141: reconcile the availability enum/boolean acceptance conflict, run a clean isolated reset and pgTAP at the candidate head, verify generated columns/types, independently review, then update the PR. Do not mark Done based on static tables alone.
3. Obtain a staging URL and authorized synthetic QA accounts from the staging owner before SCRUM-162/163/164/167 or any live demo.
4. Resolve SCRUM-142 policy tests before attempting dependent seed/storage/search integration.
5. For SCRUM-146, repair the generator path/notes and print layout, run its workbook validation script in CI, and obtain peer review; keep Jira status as its own deliverable state. For SCRUM-168, produce verified member-by-member review outcomes and an explicit carry-over decision, then obtain actual staging/demo and retrospective input or state those unavailable.
6. Complete each remaining issue only against its acceptance evidence; do not mark tickets Done or close the sprint to force a green count. If closing with unfinished issues is explicitly requested, preserve their statuses and document carry-over.
