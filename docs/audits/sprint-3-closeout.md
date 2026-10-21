# Sprint 3 Closeout and Carry-over Report

**Prepared:** 2026-10-21 (PST)
**Project:** Abang Cebu AI (`SCRUM`)
**Board:** SCRUM board (ID 1)
**Sprint:** Sprint 3 (ID 72)
**Prepared by:** Hermar L. Centillas Jr.

## Executive summary

Sprint 3 remains active (scheduled through 2026-11-02 13:00 UTC). A fresh live Jira sprint-issues query returned 35 issues. At this verified snapshot: **8 Done, 24 IN DEVELOPMENT, 0 IN REVIEW, 2 READY, 1 BLOCKED**; therefore, 27 issues remain not Done. An active sprint is not a declaration of acceptance or completion.

This is an evidence-based closeout draft, not a completed sprint review or declaration that the sprint is complete. No staging demonstration was verified. The team retrospective was not run and no participant feedback was collected. Do not close Sprint 3 or mark unfinished issues Done until their acceptance evidence exists, or the user explicitly chooses to close with honest carry-over.

## Sprint metadata and reconciliation

- Sprint 3: **active**; scheduled 2026-10-19 00:54 UTC to 2026-11-02 13:00 UTC. Live `jira_get_sprints(boardId=1, state='active')` returns Sprint 3 active.
- Inventory: 35; `jira_get_sprint_issues(sprintId=72)` returned all 35 in this response. Status arithmetic: 8 Done + 24 IN DEVELOPMENT + 0 IN REVIEW + 2 READY + 1 BLOCKED = 35. A separate prior JQL snapshot matched; refresh before relying on it.
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

- [PR #7 — SCRUM-140/141](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/7), head `25fe87492b164438b29bb9f3b82f42b9770a43af`: OPEN, merge state CLEAN; CI and secret scan passed; Supabase Preview skipped; CodeRabbit skipped manual review; no formal review decision. It is unmerged and incomplete: the migration-order fix at `4b0eeb1` is not yet in this PR, a separate session owns validation paths, and SCRUM-140 acceptance retains the availability boolean-versus-enum ambiguity. SCRUM-140 remains IN DEVELOPMENT.
- [PR #6 — SCRUM-143](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/6), head `c64e8a08a247799131597d5f39f21a1aee79fa50`: OPEN, merge state CLEAN; CI and secret scan passed; Supabase Preview skipped; no formal review decision. Jira history says anon/authenticated RPC usability depends on SCRUM-142 policies; validate against current head before declaring acceptance.
- [PR #9 — SCRUM-157](https://github.com/hermarDev/Abang_Cebu_AI_Group2/pull/9), head `8e5f1531d6f040b3ef9564c798c23bcd9aadbb99`: OPEN, merge state CLEAN; CI and secret scan passed; Supabase Preview skipped; no formal review decision. Jira history confirms live listing search/results/card-to-pin remains blocked on SCRUM-142/143. CI does not execute local Vitest suites.
- PRs #1–3 were reported open and behind main in the reviewed snapshot; checks included skipped Supabase Preview and CodeRabbit status only. PR #8 was open and dirty in earlier evidence; PR #10 was described as a companion review PR. Refresh these states before relying on them.

### Infrastructure, IAM, and staging

- SCRUM-134 is IN DEVELOPMENT, assigned to Michelle. Acceptance requires a working HTTPS staging URL, redeployable runbook, and proof server-only secrets do not reach browser. No URL/demo evidence was found in the reviewed ticket comments/repository. Staging/demo, deployment, monitoring and staging-dependent QA are NOT VERIFIED.
- SCRUM-137 is IN DEVELOPMENT, assigned to Edrich. Latest Jira comments describe an IAM proposal with resource placeholders; read-only `iam:ListGroups` and `ec2:DescribeInstances` returned AccessDenied. No AWS policy deployment or live allow/deny tests are evidenced.
- SCRUM-144 is READY, assigned to Dency. Its comment says seed data depends on unmerged schema PR #7; do not duplicate the seed or create accounts from real credentials.
- SCRUM-145 is IN DEVELOPMENT, assigned to Dency. This session observed an active isolated local Supabase verification process in `/home/hrmr/Abang_Cebu_AI_Group2-scrum145`; no Jira status or assignee change was made here. Recheck its verified storage-policy and restore results after that work completes; do not infer acceptance from process activity alone.
- SCRUM-162 is READY, assigned to Jenny. Jira comments report 0/100 scenarios executed and no available staging, and list unresolved case scope/doc contradictions. No staging run was performed. Never use sample credentials from docs.
- [SCRUM-168](https://abangcebuai.atlassian.net/browse/SCRUM-168) is IN DEVELOPMENT, assigned to Hermar. Jira still has a prior `sprint-3-closeout.md` attachment with an outdated SCRUM-146 status phrase; this report revision corrects it. No transition or sprint-lifecycle change was made.

### Search, QA and remaining issue scope

- SCRUM-156 is BLOCKED. Jira history documents its marker/search integration dependency on SCRUM-142/143 and an open product clarification over USC campuses/pin/radius. Confirm latest blocker before unblocking.
- SCRUM-157 is IN DEVELOPMENT. Unit/build/CI evidence does not meet live search/card-to-pin acceptance; independent review and integration gates remain.
- SCRUM-163 is IN DEVELOPMENT, assigned to Karla. Latest Jira comment reports 0/63 cases run; RBAC middleware and staging are not available and test-spec contradictions need resolution.
- SCRUM-167 is IN DEVELOPMENT, assigned to Karla. Latest Jira comment reports 0/6 staging scenarios executed; staging and search dependencies block the run, and listing detail/gated-action coverage has open questions.
- SCRUM-160 is DONE, assigned to Edrich. The Modules 3–5 FSD is attached as Jira attachment 10507; review verified ten function specifications with all required headings, DOCX package integrity, Arial 12 pt/double spacing, and a 21-page LibreOffice render. No PR was required or found for this documentation deliverable.
- [SCRUM-146](https://abangcebuai.atlassian.net/browse/SCRUM-146) is Done, assigned to Dency. Jira attachment 10474 is a four-sheet workbook documenting `profiles` and `kyc_verifications` (20 columns) from the two migrations on pinned `origin/main`; it excludes the ten tables in the still-open SCRUM-140/141 PR #7. The acceptance criterion is every migrated column, so the workbook matches the main-branch applied baseline described in its evidence; revalidate against the merged schema when PR #7 lands. No transition or review was made here.
- Other IN DEVELOPMENT tickets listed above have not been individually audited against current artifacts in this report; their statuses are not acceptance proof, and any prior evidence must be refreshed before approval.

### Sprint 4 future backlog

At the last complete endpoint/JQL cross-check, Sprint 4 (ID 73) had 13 READY assigned issues. These are future work, not Sprint 3 completions and not authorized carry-over targets:

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

All-member acceptance review: PARTIAL; only targeted evidence was refreshed here. Staging demonstration: NOT VERIFIED; no staging URL/demo evidence. Team retrospective: NOT RUN; no team feedback collected. Sprint 4 draft backlog: the previous report listed 13 READY issues; Sprint 4 membership was not revalidated here. These remain blockers to SCRUM-168's acceptance criteria; Jira remains IN DEVELOPMENT. This session made no Jira status, assignee, or sprint-lifecycle changes.


## Safe next actions

1. Refresh Jira, GitHub PR heads/checks/reviews, and local coordination claims before selecting/taking any ticket; preserve human assignees and avoid another session's branch/files.
2. SCRUM-140/141: the current PR #7 head does not include the clean-reset migration-order fix at `4b0eeb1`; coordinate with the validation owner for handoff and complete fresh-reset/pgTAP evidence, independent formal PR review, and clarify availability type before acceptance.
3. Obtain a staging URL and authorized synthetic QA accounts from the staging owner before SCRUM-162/163/164/167 or any live demo.
4. Resolve SCRUM-142 policy tests before attempting dependent seed/storage/search integration.
5. Complete each remaining issue only against its acceptance evidence; do not mark tickets Done or close the sprint to force a green count. If closing with unfinished issues is explicitly requested, preserve their statuses and document carry-over.
