# Repository instructions for agents

- Read [README.md](README.md) for setup/checks and [docs/ROADMAP.md](docs/ROADMAP.md) for scope and pending decisions. Roadmap stages are not authorization to implement unrequested work.
- Treat implementation, tests and configuration as the source of truth for current behavior. The roadmap describes the target; do not present pending features as available.
- Preserve unrelated user changes. Do not commit, push, create a PR or change repository settings unless explicitly requested; asking for a title alone is not authorization.

## Implementation

- Keep Angular components standalone and zoneless. Use signals/computed for local state, signal inputs/outputs at component boundaries and modern template control flow. Avoid duplicate state synchronized by reciprocal effects.
- Keep FEN parsing, validation and immutable position operations independent of Angular and browser APIs. Board composition must preserve metadata; syntax errors and chess plausibility warnings have different consequences (see roadmap).
- Prefer focused changes and native controls. Add dependencies only for a concrete need; do not reintroduce Router, Zone.js or a state library without a task requirement.
- Use the Node version in `.node-version`/`.nvmrc` and npm version in `package.json`. Keep both Node pins and the CI npm pin aligned when changing runtime versions. Update dependencies through npm and include the regenerated lockfile with the manifest change; do not hand-edit resolutions or bypass peer conflicts with force flags.
- Follow `.editorconfig` and ESLint. SVGs belong in `public/assets/`; temporary experiments and raw reports belong in ignored `tmp/` or CI artifacts.

## Validation and reporting

- Run checks appropriate to the change using the README commands. Application changes require lint, production build and relevant Vitest tests; interaction/layout changes also require relevant Playwright checks and a visual check when useful. Dependency changes require a clean `npm ci` and the full audit, including dev dependencies.
- Test observable behavior and regressions. Use Angular TestBed with zoneless scheduling (`await fixture.whenStable()`); do not routinely force change detection to conceal missing notifications. Use Playwright for actual browser interaction and geometry.
- Documentation/ignore-only changes need link, whitespace and `git check-ignore` checks; do not rerun the application suite solely for prose changes. Keep source, config, fixtures and lockfiles visible to Git.
- Keep README for getting started, roadmap for remaining work and product decisions, and tests for implemented edge cases. Update these existing files instead of adding per-PR reports, duplicated API descriptions or version/audit snapshots. Remove completed implementation detail from the roadmap once tests cover it; retain concise product boundaries.
- Report what changed, checks performed and any unverified limits. Propose a commit title and PR title in the final response; never claim a remote CI result from local checks.
