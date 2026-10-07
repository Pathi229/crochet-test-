# Pattern data, imports, and adapters

## Supported input format

```text
Row 1 [crown-to-brim]: 8 Black, 8 Red, 24 Black
Row 2 [brim-to-crown]: 22 Black, 9 Red, 9 Black
```

`[left-to-right]` and `[right-to-left]` are equivalent directions for generic panels. Counts must be positive whole numbers, comma-separated, with color names. Without explicit first direction, the user must confirm the starting edge. The pattern must alternate directions. Unknown color names receive a provisional swatch and a review issue. Explicit row numbers must be consecutive and totals must agree; visible preview padding/truncation is flagged, not silently approved. The original text always remains available.

Select US/UK terminology and sc/hdc explicitly. The importer does not interpret arbitrary stitch abbreviations, free-form repeats, shaping, rounds, visual actions in a video, or missing turning-chain length. A check confirms the user's turning-chain counting convention, but **does not generate turning instructions**. Foundation, turn length, and finishing remain blank unless the user enters them. Guide steps do not fill in missing construction.

Unsupported source can be retained and corrected manually through chart editing and construction fields. Unresolved issues block automatic adaptation/guide creation. Unsupported construction remains disabled even when review checkboxes are confirmed.

## Transcript adapter

`captions(text)` accepts SRT/VTT cues and simple `mm:ss text` or `hh:mm:ss text` lines. It returns `{ time: seconds, text }[]`; untimed text has no fabricated timestamp. `parsePattern` can parse supported structured row text inside those cues and preserves source timestamps in `rowRefs`. Untimed paragraphs remain source text with review questions.

`youtubeId` accepts trusted YouTube/youtu.be hosts and an 11-character video ID; it rejects lookalike domains and non-HTTP protocols. Embeds use youtube-nocookie.com only on user request; replay links use the exact source row timestamp. Automatic caption retrieval is unavailable. A future authorized creator adapter should return the same cue structure with a source link and attribution. AI interpretation should return a reviewed schema draft; it may never decide final resizing arithmetic.

## Versioned project model

A JSON backup is a schema v1 Project, not a screenshot. It includes yarn hex values/symbols, pieces, source, issues, assembly/notes, panel revisions, original panels when adapted, and a frozen session when present. `decodeProject` validates dimensions, chart/palette consistency, protected bounds, construction identifiers, safe source URLs/raster data, timestamps, and frozen progress. Future schemas are rejected instead of silently downgraded. Unknown or malformed stored libraries are not overwritten during recovery.

Pieces use x for stitches within the row and y for successive rows. `chart[y][x]` is a yarn ID. `removable[y][x]` is a separate explicit permission, not a color comparison. Imported background is provisionally safe only as part of the reviewed source interpretation. Painting or erasing a cell makes it protected; approve a selected background region in Motifs to permit removal. Named motif bounds protect their entire rectangle, including internal background. Motif bounds cannot overlap; resizing rejects overlaps with other protected content.

`start` controls row-0 physical start, with alternating working order. Crown lies at the explicitly modeled edge for beanies; the shipped beanie template uses the left edge. `rowRefs` retain source row/time/origin across adaptation. Origins distinguish source, user, and calculated rows. Review issues separately distinguish unresolved versus user-confirmed interpretation.

Measured gauge retains stitches, rows, measured distances, units, hook/yarn notes, and swatch state. Calculations convert inches to cm. Stitches/gauge-x give stitch-axis length; rows/gauge-y give row-axis length. Beanie stitches are crown-to-brim; rows wrap around the head. Fit allowance affects circumference and brim allowance affects the stitch axis.

Foundation can be template-generated (`foundationAuto`) or authored/protected. Only template foundations regenerate during count changes, with an explicit review warning. Authored foundation text remains unchanged with a warning to check counts. Turning/finishing/assembly are always retained for user review.

## Engine placement

- Pixel policy: keep cell layout. A different gauge changes physical size.
- Physical policy: use separate target/original stitch and row gauge ratios; nearest-cell remapping retains discrete yarn IDs. Warn about rounding/detail loss.
- Scale policy: scale named motif bounds using the panel's two axis ratios.
- Anchors retain margins at left/right/start/end, move with centre/front, or follow the configured seam. Offsets may be cells, cm, or inches. Physical offsets require valid gauge and round to cells.
- Fabric outside motifs stays at the selected panel placement. Crop only explicitly safe cells on approved edges. Any protected loss, border removal, motif overlap, unsupported construction, invalid dimension, or disallowed edge yields a conflict instead of a partial application.
- Prefix rows update parity. New rows have calculated origins; original rows retain their source reference. Instructions regenerate from physical charts in actual working order.
- Count repeats round upward; the preview states requested and achievable counts and measured distances. Allowed limits are checked after rounding too.

## UI and teaching conventions

Tokens and responsive layouts are documented in `DESIGN.md`. UI theme tokens never recolor yarn hex values. Symbol legends and working arrows supplement color. Cell editing uses arrow keys/Enter, with the active coordinate and yarn in the SVG accessible name; a screen-reader-friendly written row view is also available. Pan mode returns touch scrolling to the chart. Mobile completion controls reserve space and respect safe areas.

Technique diagrams are authored schematics, flagged as needing crochet review. Handedness changes hook entry direction while keeping semantic front/back labels intact. Demo action state is local to the lesson dialog and cannot update project session progress. The BLO lesson includes the yarn-over-first hdc sequence and back-loop-only insertion, not just generic hdc instructions.
