# FEN Editor

A chess position editor built with Angular 22, standalone components and zoneless change detection. Import and edit all six FEN fields, or place, erase, paint and drag pieces on the board. Board composition preserves the active color, castling rights, en passant target and move counters.

The editor uses the immutable [FEN domain core](src/app/domain/fen/index.ts), with dedicated metadata controls and Copy/Clear/Starting position/Flip commands.

[Roadmap and MVP decisions](docs/ROADMAP.md) · [Agent instructions](AGENTS.md)

## Run locally

Use the Node version in [.node-version](.node-version) (also mirrored in `.nvmrc`) and the npm version in [package.json](package.json).

```sh
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200).

## Edit a position

- Enter all six fields in **FEN draft**, then choose **Apply FEN** or press Enter. Valid input replaces the whole position and is normalized; invalid input stays in the draft with inline errors and the first error selected.
- **Applied FEN** always shows the canonical position. Board and metadata edits refresh a clean FEN draft and preserve unapplied text. **Use current position** discards the FEN draft and its errors.
- **Position details** edits the active color, four castling rights, en passant target and move counters. Valid complete integers apply immediately; empty or invalid numbers remain local with an error. Blur/Enter removes leading zeros from valid numbers; Escape restores that applied field. Unrelated edits preserve invalid numeric drafts; a successful Apply replaces them.
- **Starting position** restores the standard chess start. **Clear** empties the board, sets White to move, removes castling/en passant, and resets the counters to 0 and 1. Both discard all drafts/errors, cancel gestures and select Move while preserving orientation.
- **Flip board** reverses the display and cancels the current gesture while preserving the position, drafts and tool.
- **Copy applied FEN** copies the canonical position, including metadata, even with unapplied drafts. Success appears after the clipboard write completes; if copying is denied or unavailable, the applied text is selected for manual copying.
- Plausibility warnings describe the applied position and do not block editing, importing or copying.

## Checks

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript and template lint |
| `npm test -- --watch` | Vitest during development |
| `npm run test:ci` | Domain and component tests once, with coverage |
| `npm run build` | Production output in `dist/fen-editor/browser/` |
| `npm run e2e` | Chromium tests against an automatically built/served production app |
| `npm run audit:ci` | Full dependency audit; high/critical findings fail |

Before the first E2E run, use `npx playwright install chromium` (`--with-deps` on Linux). With `CI=true`, run the build before E2E; the test preview uses `127.0.0.1:4173`. Tests stop the preview automatically.

[CI](.github/workflows/ci.yml) runs checks on PRs and main; [Dependabot](.github/dependabot.yml) checks updates weekly. Generated reports stay in ignored output folders or CI artifacts. Keep `package-lock.json` in Git for reproducible installs.

Current behavior lives in the implementation/tests; the roadmap tracks unfinished work and decisions. Do not maintain per-PR reports or duplicate code documentation.
