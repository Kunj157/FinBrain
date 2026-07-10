# Development Workflow Rules (for AI agents)

## Git & Branch Strategy

1. **Default branch** is `main` — only production-stable, released code lives here.

2. **Working branch** is `dev` — the latest codebase state. All feature/fix branches are created from and merged into `dev`.

3. **Branch naming convention**:
   - `feature/<description>` — for new features
   - `fix/<description>` — for bug fixes
   - `hotfix/<description>` — for urgent production fixes
   - `patch/<description>` — for patches

4. **Sequential commits** — never commit all changes at once. Make granular, well-scoped commits with detailed, descriptive messages.

5. **Pull request workflow**:
   - From a feature/fix branch → PR into `dev`
   - Once all work for a phase is complete and tested on `dev` → PR from `dev` to `main`
   - After merging into `main`, create an **automated versioned release** by reading the version from the top of `CHANGELOG.md`

6. **Phase completion reminder** — at each stage when a phase is completed, the AI agent **must remind** the user so they can create the PR from `dev` to `main` and create a release.

## Issue Tracking

1. **Create a GitHub issue** for every bug found or feature requested — whether identified by the user or discovered during development.

2. **Reference the issue** in the branch name and in commit messages (e.g. `fix: add onboarding link to sidebar (#1)`).

3. **Link the issue** in the PR description using GitHub's closing keywords (e.g. `Closes #1`) so the issue auto-closes when the PR merges.

4. **Close issues only via PR merge** — never close manually. This ensures the code change is always traceable to the issue.