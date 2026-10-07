# Validation results

The current cloud instance uses Node 24.19.0, npm 11.9.0, and system Chromium. A frozen `npm ci` installation completed successfully. No external credentials or runtime services were needed.

| Check                                                  | Observed result                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript + production build (`npm run build`)        | Passed; static bundle produced in `dist/`                                                                                           |
| Core suite (`npm test`)                                | 54 tests passed                                                                                                                     |
| Desktop/mobile Chromium workflows (`npm run test:e2e`) | 14 tests passed, 7 per viewport profile                                                                                             |
| ESLint                                                 | Passed                                                                                                                              |
| Prettier check                                         | Passed                                                                                                                              |
| Working-tree whitespace check                          | Passed                                                                                                                              |
| Local production preview smoke                         | Passed; opened the built app and verified both required adapted 60-stitch rows, with no runtime errors                              |
| Responsive inspection                                  | 390, 768, and 1440 px: no page-level horizontal overflow or runtime errors in projects/editor; light and dark screenshots inspected |

Core cases include both initial working directions, prefix-row parity, separate background insertion beside a motif-colored edge, protected artwork and borders, impossible reductions, approved edges, repeat rounding, unit conversion and axis mapping, physical motif ratios/offsets, discrete color remapping, chart/instruction totals, timed/untimed imports, source ambiguity, unsupported construction, frozen session data, backup round trips, connected fill, mirror/copy/move, user-authored foundation preservation, row provenance, invalid backup sources, and text contrast.

Browser cases cover creation, keyboard cell editing, undo/redo, autosave and reload, guide completion/undo, Beginner Mode, separate technique demo navigation, exact beanie adaptation, impossible reduction, reviewed written import, unsupported source blocking, appearance, responsive layout, selection controls, local image conversion, original-image retention, exported-backup restoration, YouTube link validation, caption timestamps, and session revision retention after edits.

A separate production-preview browser smoke opened the bundled build, adapted the beanie, and read the resulting rows: `8 Black, 8 Red, 44 Black` and `42 Black, 9 Red, 9 Black`.

This validation establishes software behavior. It does not establish physical crochet correctness, garment fit, independent technique review, Safari/device hardware behavior, third-party embed availability, universal transcript access, cloud sync, or environment publication/restoration. Tests used synthetic/local data and did not fetch or publish third-party tutorials. Review physical swatches, assembly, and teaching diagrams before treating them as authoritative.

The reusable environment draft contains `install_script` and `start_skill`. Its confirmed save does not apply or publish a new environment version. Review and save in environment settings, then publish when desired.
