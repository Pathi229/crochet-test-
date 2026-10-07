# Crochet Studio

A local-first crochet chart editor and learning workspace built with React 19, TypeScript, and Vite 8. Branding lives in `src/App.tsx` and `index.html`; semantic visual tokens live in `src/styles.css`.

## Run

Node 22.12+ (Node 24 tested) and npm are required.

```sh
npm ci
npm run dev
```

The dev server defaults to port 5173. To build and serve the production bundle:

```sh
npm run build
npm run preview
```

No environment variables, accounts, or API credentials are required. `npm --cache /tmp/crochet-npm-cache ...` works in cloud machines where the default home cache is not writable.

## Working features

- Warm, responsive project library with authored example charts, project creation, search, sorting, duplication, deletion, light/dark/system appearance, and backup restoration.
- Flat sc/hdc panels, optional BLO, alternating directions, explicit starting edge, multiple pieces, editable foundation/turning/finishing/assembly, US/UK terminology labels.
- Paint, erase, connected fill, eyedropper, keyboard cell editing, rectangle selection, move/copy, horizontal/vertical mirroring, yarn palette editing, color replacement, pan, zoom, fit, cell symbols, numbering, and written row previews.
- Explicit protection: painted and erased cells remain protected until background removal is approved. Named motifs have edge/centre/seam anchors, offsets in cells/cm/in, separate row anchors, and pixel/physical/project-scale policies. Borders, allowed edges, and count repeats constrain adaptation.
- Count-based or gauge-based resizing with requested/achievable dimensions, fit and brim allowances, added-fabric hatching, removed-fabric comparison, conflicts, review warnings, original panel preservation, and deterministic working-order regeneration.
- Reviewed written pattern import; YouTube ID validation, creator attribution, transcript paste, SRT/VTT uploads, preserved timestamps, opt-in embeds, and source replay links. Narration is retained for manual interpretation rather than fabricated into a pattern.
- Local PNG/JPEG/WebP/GIF image conversion, numeric percentage crop, resizing, bounded palette quantization, preview, manual cleanup, and preserved original raster. Images create artwork, not shaping.
- Revision-frozen row/block guides with actual working direction, foundation/turn/finish/assembly where defined, complete/previous/undo completion, stitch counter, notes, reload recovery, current-region chart outlines, next instruction, and persistent Beginner Mode.
- Authored schematic technique lessons with separate demonstration navigation, handedness-aware hook direction and labels, BLO-specific insertion guidance, and explicit craft-review status.
- IndexedDB autosave with truthful pending/error status, reload recovery, schema-checked JSON backup import/export, retained revision history and sessions, and printable charts, yarn legends, and written instructions.

## Model and resizing rules

See [docs/DESIGN.md](docs/DESIGN.md) and [docs/FORMAT.md](docs/FORMAT.md). `src/model.ts` defines schema v1. The chart, guide, and written rows share the same data; the renderer does not maintain an independent pattern copy.

`src/resize.ts` is independent of React. It normalizes changes into physical coordinates, checks permissions and protection, rounds repeats, places motifs, preserves source-row references, and then regenerates working order. Odd prefix-row changes flip the new starting edge so the original rows retain their working direction. No negative or out-of-bounds count is emitted.

For the required 40→60 beanie study, crown-to-brim `8 Black, 8 Red, 24 Black` becomes `8 Black, 8 Red, 44 Black`; brim-to-crown `22 Black, 9 Red, 9 Black` becomes `42 Black, 9 Red, 9 Black`.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright uses system Chromium when `/usr/bin/chromium` is present. Else run `npx playwright install chromium` once. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects another installed browser. Tests cover desktop Chromium and a mobile Chromium viewport/touch profile; this is not a claim of Safari/device hardware testing. Browser output and screenshots are ignored under `test-results/`.

## Integration boundaries

There is no AI provider or automatic transcript retrieval in this release. YouTube's official caption download is authorization/permission controlled; a public link is not proof of download access. The current local transcript adapter is documented in `docs/FORMAT.md`. Future AI must run server-side, validate a draft against the pattern model, treat transcripts as untrusted content, and leave all resizing arithmetic to the deterministic engine. Do not add API keys to `VITE_*` variables or client bundles.

The only external browser content is an opt-in YouTube embed/source link. If embedding is blocked, open the original source. Fonts are system fonts; no font download or image generation service is used. During implementation the environment blocked direct documentation-site access; official React/Vite markdown and YouTube API discovery data were consulted through their official GitHub repositories.

## Limits and next milestone

This is a functional flat-panel first release, not a universal pattern interpreter. Each axis is limited to 200 cells, projects to 20 pieces, and upload files to 12 MB. Unknown colors receive provisional swatches and review questions. Unsupported construction can be stored and manually edited, while automatic resizing and guide initiation stay disabled. Review confirmation records the user's decision; it cannot prove source or crochet correctness.

Nearest-cell artwork remapping can lose fine detail; approximate physical preservation is never exact. No shaping, rounds, C2C, filet, amigurumi, automatic handle construction, realistic 3D simulation, universal transcripts, cloud sync, or publishing is implemented. Palette quantization is a bounded local approximation; complex raster images often need cleanup. Image cropping uses percentage inputs rather than a drag crop editor. Named anchors currently represent edges, centre/front, and the configured seam; arbitrary named construction locations are a future extension.

Browser storage is device/browser specific. Export a backup before clearing data. Session progress is frozen; starting a replacement session requires an explicit action and warns that it replaces progress. Undo/redo operates during the open editing workspace; persisted revisions and backups retain prior panel states, but undo stacks do not survive reload. The last 15 panel revisions are retained.

Templates, assembly recipes, gauge/fit outcomes, and teaching schematics **need independent physical crochet review**. Software tests establish count/coordinate behavior, not garment fit or authoritative technique teaching. The next milestone is craft review on physical samples, richer diagram instruction, a source-row correction editor, larger-grid rendering, and a server-side interpretation adapter if a provider is chosen.
