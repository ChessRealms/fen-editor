# PR-01: contracts and modernization baseline

This planning package defines the starting point and implementation contracts for the FEN Editor modernization. PR numbers identify planning stages; PR-01 and PR-02 are delivered together. See [PR-02](../pr-02/README.md) for implemented behavior and current verification results.

Baseline commit: `0e27c2a51350b461d39c7fe92d859d5c0901abb6` (`Feature/1 (#1)`). Captured on 2026-09-26/27 in the Europe/Kyiv time zone; machine-readable evidence records UTC where available.

## Deliverables

| Backlog item | Deliverable | Acceptance |
| --- | --- | --- |
| B01: current behavior | [Baseline](baseline.md), source inventory and command evidence | Existing features, known defects and verification limits are distinguishable |
| B02: editor contracts | [FEN and editor contracts](contracts.md) | Parser policy, diagnostics, draft synchronization and toolbar semantics are unambiguous |
| B03: platform and security | [Platform matrix](platform.md), [baseline summary](evidence/baseline-summary.json) | Candidate versions, peer constraints, browser policy and original security findings are recorded |

These decisions are the implementation baseline for subsequent stages. The original Angular 17 test failure and dependency findings below describe baseline capture; PR-02 records their replacement. Raw audit payloads, registry responses and command logs are local verification artifacts, excluded from the delivery diff; the compact baseline summary and reproduction commands remain versioned.

## Delivery boundaries

| PR | Scope and dependencies |
| --- | --- |
| PR-02 | New Angular 22.2 standalone/zoneless shell in this repository, asset/component port, dependency cleanup, lint, Vitest, CI and Playwright smoke; depends on B01-B03 |
| PR-03 | Pure TypeScript FEN domain, immutable operations, syntax errors and plausibility warnings; depends on PR-02 and these contracts |
| PR-04 | Signal editor state and atomic FEN import; remove the legacy model/parser; depends on PR-03 |
| PR-05 | All metadata controls, Copy/Clear/Reset/Flip and synchronization tests; depends on PR-04 |
| PR-06 | Pointer Events, touch interactions and responsive layout; depends on the PR-04 command contract and PR-05 UI |
| PR-07 | Complete keyboard interaction, accessible semantics and manual accessibility checks; depends on PR-05/06 |
| PR-08 | Full browser regression, dependency remediation, documentation and release gates; depends on all previous PRs |

Each implementation PR includes tests for its behavior. Tests are not postponed to PR-08. Generate the fresh scaffold in a temporary directory during PR-02 and port it deliberately; preserve repository history and assets. Do not carry two implementations into the final editor.

## MVP release contract

- Import and export all six FEN values without semantic loss within the documented numeric limits.
- Invalid input produces a precise error and leaves the applied position unchanged.
- Board and metadata controls reflect one applied position; an unapplied draft is visibly distinct.
- Copy, Clear, Starting position/Reset and Flip follow the documented semantics.
- Mouse, touch and keyboard users can place, move and remove pieces.
- Production build, lint, unit/component tests and required E2E projects pass in CI.
- The complete dependency audit, including development dependencies, has zero high or critical findings.

Undo/redo, shareable URLs, persistence, PGN, chess variants and full legality analysis are post-MVP. Reserve command boundaries and immutable positions for history, but do not implement history or routing preemptively.

## Effort and principal risks

The implementation plan estimates 17-25 developer days, or 20-30 with tooling/mobile QA contingency, for one developer familiar with Angular. PR-01 is the 1-2 day planning/baseline slice. The estimate is not a delivery guarantee.

The main risks are pointer cancellation/scroll behavior, preserving metadata and unapplied drafts, toolchain compatibility, and transitive vulnerabilities. The contracts address data-loss risks; PR-02 must prove the toolchain; PR-06/07 must verify real device and keyboard behavior; PR-08 must enforce the security gate.
