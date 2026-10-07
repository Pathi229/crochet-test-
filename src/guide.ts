import {
  runs,
  direction,
  clone,
  type Project,
  type Session,
  type Piece,
  type Yarn,
} from "./model";
export interface GuideStep {
  id: string;
  kind: "foundation" | "row" | "block" | "turn" | "finishing" | "assembly";
  piece: number;
  row?: number;
  from?: number;
  to?: number;
  text: string;
  short: string;
  count?: number;
  timestamp?: number;
}
export function stitchName(p: Piece, uk = false) {
  return p.stitch === "sc"
    ? uk
      ? "double crochet"
      : "single crochet"
    : uk
      ? "half treble crochet"
      : "half double crochet";
}
export function guideSteps(s: Session): GuideStep[] {
  const steps: GuideStep[] = [];
  const names = (c: string) => s.palette.find((y) => y.id === c)?.name || c;
  s.pieces.forEach((p, pi) => {
    if (p.foundation)
      steps.push({
        id: `${pi}-foundation`,
        kind: "foundation",
        piece: pi,
        text: p.foundation,
        short: "Foundation",
      });
    for (let row = 0; row < p.height; row++) {
      const start = direction(p, row);
      const edge =
        p.template === "beanie"
          ? start === p.crownEdge
            ? "crown"
            : "brim"
          : start === "left"
            ? "left"
            : "right";
      const blocks = runs(p, row);
      if (s.mode === "row") {
        const instructions = blocks
          .map((b) => `${b.count} ${names(b.color)}`)
          .join(", ");
        steps.push({
          id: `${pi}-${row}`,
          kind: "row",
          piece: pi,
          row,
          from: start === "left" ? 0 : p.width - 1,
          to: start === "left" ? p.width - 1 : 0,
          count: p.width,
          text: `Work ${p.width} ${stitchName(p, s.terminology === "UK")} stitches${p.blo ? " in back loop only" : ""}, starting at the ${edge}. ${instructions}.`,
          short: `${p.stitch === "sc" ? (s.terminology === "UK" ? "dc" : "sc") : s.terminology === "UK" ? "htr" : "hdc"} ${p.width}${p.blo ? " BLO" : ""} · ${instructions}`,
          timestamp: p.rowRefs[row]?.timestamp,
        });
      } else
        blocks.forEach((b, i) =>
          steps.push({
            id: `${pi}-${row}-${i}`,
            kind: "block",
            piece: pi,
            row,
            from: b.from,
            to: b.to,
            count: b.count,
            text: `Work ${b.count} ${stitchName(p, s.terminology === "UK")} stitches${p.blo ? " in back loop only" : ""} in ${names(b.color)}, from stitch ${b.from + 1} toward stitch ${b.to + 1}.`,
            short: `${b.count} ${names(b.color)} · ${p.stitch.toUpperCase()}${p.blo ? " BLO" : ""}`,
            timestamp: p.rowRefs[row]?.timestamp,
          }),
        );
      if (row < p.height - 1 && p.turning)
        steps.push({
          id: `${pi}-${row}-turn`,
          kind: "turn",
          piece: pi,
          row,
          text: p.turning,
          short: "Turn your work",
        });
    }
    if (p.finishing)
      steps.push({
        id: `${pi}-finish`,
        kind: "finishing",
        piece: pi,
        text: p.finishing,
        short: "Finish the panel",
      });
  });
  if (s.assembly)
    steps.push({
      id: "assembly",
      kind: "assembly",
      piece: 0,
      text: s.assembly,
      short: "Assembly",
    });
  return steps;
}
export function startSession(p: Project, mode: "row" | "block"): Session {
  return {
    revision: p.revision,
    pieces: clone(p.pieces),
    palette: clone(p.palette),
    terminology: p.terminology,
    assembly: p.assembly,
    mode,
    cursor: 0,
    completed: 0,
    counter: 0,
    notes: "",
    started: new Date().toISOString(),
    adapted: p.adapted,
  };
}
export function completeStep(s: Session): Session {
  const total = guideSteps(s).length;
  return {
    ...s,
    completed: Math.max(s.completed, s.cursor + 1),
    cursor: Math.min(total - 1, s.cursor + 1),
    counter: 0,
  };
}
export function undoCompletion(s: Session): Session {
  return {
    ...s,
    completed: Math.max(0, s.completed - 1),
    cursor: Math.max(0, s.completed - 1),
    counter: 0,
  };
}
export function writtenRows(p: Piece, pal: Yarn[]) {
  return Array.from({ length: p.height }, (_, i) => ({
    row: i + 1,
    direction: direction(p, i),
    text: runs(p, i)
      .map(
        (r) =>
          `${r.count} ${pal.find((y) => y.id === r.color)?.name || r.color}`,
      )
      .join(", "),
    total: p.width,
    ref: p.rowRefs[i],
  }));
}
