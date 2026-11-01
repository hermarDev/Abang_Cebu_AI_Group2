# Git and collaboration workflow

Hermar Centillas and Edirch Bardilas are the current team. Coordinate ownership before changing shared files. Submit focused changes through a pull request to `main`; a related GitHub issue or pull request may be linked when useful. Jira is not required.

## Start a branch

Follow [CONTRIBUTING.md](../../CONTRIBUTING.md) for setup and fork instructions. Check `git status` first and preserve unrelated work. From a clean, up-to-date `main`, create a branch with a short description:

```bash
git switch -c feature/rental-search
```

Use `feature/`, `fix/`, `docs/` or `chore/` as appropriate. Use concise conventional commit messages such as `fix: handle empty search results`. Confirm the destination remote before pushing and do not force-push shared history.

## Verify and submit

Run the applicable checks described in [CONTRIBUTING.md](../../CONTRIBUTING.md). For application changes, the standard checks are:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint --max-warnings=0
pnpm build
```

CI runs these checks and a separate secret scan. Run relevant browser tests where available. For documentation-only changes, check links and examples and explain any checks not run. Report failures and blocked checks rather than checking them off as passed.

Open a pull request using the [template](../../.github/pull_request_template.md). Explain the change, verification, risks and any migration or rollback steps. Include screenshots for visual changes. Never include secrets, production credentials or real user records.

## Review and merge

Request review from the other team member when available. Address feedback and ensure required checks and applicable reviews pass before an authorized maintainer merges. Use squash merging when appropriate. A pushed branch or approved pull request is not proof of deployment.
