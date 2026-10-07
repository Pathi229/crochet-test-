# Crochet Studio design and implementation specification

## Implementation plan

1. Define and test a versioned, flat rectangular pattern model and deterministic resizing engine.
2. Build a direct chart editor, templates, gauge adaptation, and reviewed imports.
3. Add IndexedDB autosave, portable JSON projects, print output, and revision-frozen crochet sessions.
4. Exercise logic and desktop/mobile workflows, refine the interface, document remaining craft review.

## Visual system

Warm ivory (#F7F5F0), paper (#FFFEFB), ink (#252821), olive (#526346), clay (#B9765F). Semantic CSS custom properties separate interface colors from yarn hex colors. Charcoal dark theme, system appearance default. System sans-serif controls; restrained Georgia editorial headings. Tabular numerals. 4/8 px rhythm, 10/16 px radii, quiet borders, sparse elevation. Canvas dominates; compact labelled tools and an opaque inspector. Small frosted canvas toolbar with solid fallback. No stock imagery or decorative dashboard widgets. Author-generated pixel artwork supplies project identity.

Focus outlines, minimum 40 px targets, labelled diagrams, symbols on yarn swatches and optional cells. Short transitions; reduced-motion opt-out. Narrow screens stack chart and inspector with horizontally scrolling tools. Guide completion stays available without overlaying text.

## Model and constructions

Schema v1: projects contain rectangular pieces, palette, US/UK terminology, source, validation issues, notes, revisions, and optional frozen sessions. Piece x = stitch axis; y = row axis. Color IDs and explicit safe-to-remove masks are separate. Every row carries its original source row and optional timestamp. Working direction alternates from an explicit starting edge; crown is physical x=0 for side-to-side beanies. Gauge stores original units and measured swatch inputs; calculations convert to centimetres. Motifs have named bounds, size policy, anchor, offsets, and protected geometry. Edges specify permission to add/remove background; borders and repeat constraints prevent invalid reductions. Foundation, turning, finishing, and assembly are authored text, never inferred from an imported grid.

Supported: flat alternating-row sc/hdc panels, optional BLO. Blanket/wall hanging, scarf, cushion, tote panels, and side-to-side beanie panel templates. Multiple rectangular pieces and editable assembly. No shaping, rounds, C2C, filet, amigurumi, or automatic garment grading. Template assembly and technique diagrams are authored drafts needing physical crochet review, not fit guarantees.

## Integrations

No credentials required for the first release. Images, structured patterns, transcripts and captions are processed locally. YouTube links embed only after user action. There is no universal caption fetching and no AI provider in this release. Future adapters must operate server-side with schema validation; credentials must never enter client bundles. Official captions.download is permission-controlled, not a public transcript endpoint.
