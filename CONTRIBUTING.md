# Contributing to AbangCebuAI

Submit changes through a pull request to `main`. Contributors without repository write access should use a personal fork. Maintainers with write access may push a topic branch to the central repository; this does not replace review or authorize a direct push to `main`.

## Set up your checkout

Follow the [README](README.md) for Node.js, pnpm, environment variables and database setup. Use a development database, not production credentials.

For a fork, clone your copy and add the central repository as `upstream`:

```bash
git clone https://github.com/YOUR-USERNAME/Abang_Cebu_AI_Group2.git
cd Abang_Cebu_AI_Group2
git remote add upstream https://github.com/hermarDev/Abang_Cebu_AI_Group2.git
git remote -v
```

Before starting work, inspect `git status`. Save or finish unrelated changes before switching branches. With a clean working tree, update your local `main`:

```bash
git switch main
git fetch upstream
git merge --ff-only upstream/main
git switch -c feature/SCRUM-54-short-description
```

If `origin` points to the central repository rather than your fork, use `origin` instead of `upstream`. If the fast-forward fails, inspect the branch divergence with the maintainer; do not force-reset your work.

Use `feature/`, `fix/`, `docs/` or `chore/` followed by the Jira key and a short description. See the [Git workflow](docs/architecture/git-workflow.md) for team conventions. Confirm ownership before editing files another contributor is changing.

## Keep the change focused

Use existing components and project patterns. Avoid unrelated formatting, dependency updates or refactors in a feature or bug-fix pull request. Add a regression test for a bug fix and update documentation when setup, behavior or configuration changes.

For UI work, check narrow and desktop layouts, keyboard access, and loading, empty and error states. Include screenshots when appearance changes. Authentication or database work needs evidence for the affected permissions and failure paths. Include migration and rollback notes when schema changes require them; do not run shared database changes without approval.

Do not include secrets, real user records or production tokens in commits, fixtures, logs or screenshots. Report suspected credential exposure privately to the maintainer rather than posting the value in an issue.

## Verify locally

Run the checks supported by your branch:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Run relevant browser tests when the branch includes them. For manual checks, record the route, viewport and observed result. Documentation-only changes need link and command checks; explain when an application build or browser run is not applicable.

Report failed, blocked and unrun checks explicitly. A checked box means the check ran and passed. Do not describe mocked tests as live-service verification. CI currently checks types, lint and build, with a separate secret scan; its configuration does not yet run the unit suite. Contributors must still run `pnpm test` locally.

## Commit and submit

Inspect the diff and stage only the files belonging to the task. Replace the example paths with your own:

```bash
git status
git diff
git add path/to/changed-file path/to/regression-test
git diff --staged
git commit -m "fix(SCRUM-54): describe the change"
git push -u origin HEAD
```

Check that `origin` is the intended destination before pushing. Do not force-push shared history or include unrelated work.

Open a pull request against `hermarDev/Abang_Cebu_AI_Group2:main`. Use the [PR template](.github/pull_request_template.md), link the Jira ticket, and explain the change, verification and remaining risks. Call out configuration changes and anything a reviewer must do to reproduce the result.

Request review from the relevant area owner and the team lead, @hermarDev. Address review comments with follow-up commits. The team lead handles approval and squash merging; publication to a topic branch does not mean the change is merged or deployed.
