export const SCHEMA = 1;
export type Edge = "left" | "right";
export type Policy = "pixels" | "physical" | "scale";
export interface Yarn {
  id: string;
  name: string;
  hex: string;
  symbol: string;
}
export interface Gauge {
  stitches: number;
  rows: number;
  stitchDistance: number;
  rowDistance: number;
  unit: "cm" | "in";
  hook: string;
  yarn: string;
  state: "unwashed" | "blocked" | "washed";
}
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Motif {
  id: string;
  name: string;
  bounds: Bounds;
  anchor: "left" | "right" | "center" | "seam";
  rowAnchor: "top" | "bottom" | "center";
  offsetX: number;
  offsetY: number;
  offsetUnit: "cells" | "cm" | "in";
  policy: Policy;
}
export interface RowRef {
  sourceRow?: number;
  timestamp?: number;
  origin: "source" | "user" | "calculated";
}
export interface Piece {
  id: string;
  name: string;
  construction: "flat" | "unsupported";
  template: Template;
  width: number;
  height: number;
  chart: string[][];
  removable: boolean[][];
  background: string;
  stitch: "sc" | "hdc";
  blo: boolean;
  start: Edge;
  crownEdge: Edge;
  gauge?: Gauge;
  foundation: string;
  foundationAuto: boolean;
  turning: string;
  finishing: string;
  motifs: Motif[];
  rowRefs: RowRef[];
  approvedEdges: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
  border: number;
  repeatX: number;
  repeatY: number;
  seam: Edge;
  fitAllowance: number;
  brimAllowance: number;
  orientation: string;
}
export type Template =
  "beanie" | "blanket" | "scarf" | "cushion" | "tote" | "custom";
export interface Source {
  kind: "written" | "tutorial" | "image" | "example";
  text: string;
  url?: string;
  videoId?: string;
  attribution: string;
  timed: { time: number; text: string }[];
  originalImage?: string;
}
export interface Issue {
  id: string;
  message: string;
  resolved: boolean;
}
export interface Revision {
  number: number;
  at: string;
  label: string;
  pieces: Piece[];
}
export interface Session {
  revision: number;
  pieces: Piece[];
  palette: Yarn[];
  terminology: "US" | "UK";
  assembly: string;
  mode: "row" | "block";
  cursor: number;
  completed: number;
  counter: number;
  notes: string;
  started: string;
  adapted: boolean;
}
export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  template: Template;
  created: string;
  updated: string;
  revision: number;
  palette: Yarn[];
  pieces: Piece[];
  assembly: string;
  notes: string;
  terminology: "US" | "UK";
  source?: Source;
  issues: Issue[];
  revisions: Revision[];
  session?: Session;
  example: boolean;
  adapted: boolean;
  original?: Piece[];
}
export interface Settings {
  theme: "system" | "light" | "dark";
  beginner: boolean;
  hand: "right" | "left";
  symbols: boolean;
}
export interface Library {
  schemaVersion: 1;
  projects: Project[];
  settings: Settings;
}
export const uid = () => crypto.randomUUID();
export const clone = <T>(v: T): T => structuredClone(v);
export const cm = (n: number, unit: "cm" | "in") =>
  n * (unit === "in" ? 2.54 : 1);
export const gaugeRates = (g: Gauge) => ({
  x: g.stitches / cm(g.stitchDistance, g.unit),
  y: g.rows / cm(g.rowDistance, g.unit),
});
export function validGauge(g: Gauge | undefined): g is Gauge {
  return (
    !!g &&
    [g.stitches, g.rows, g.stitchDistance, g.rowDistance].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  );
}
export const direction = (p: Piece, row: number): Edge =>
  row % 2 === 0 ? p.start : p.start === "left" ? "right" : "left";
export interface Run {
  color: string;
  count: number;
  from: number;
  to: number;
}
export function runs(p: Piece, row: number): Run[] {
  const cells = p.chart[row];
  const indices = Array.from({ length: p.width }, (_, i) =>
    direction(p, row) === "left" ? i : p.width - 1 - i,
  );
  const result: Run[] = [];
  for (const x of indices) {
    const last = result.at(-1);
    if (last?.color === cells[x]) {
      last.count++;
      last.to = x;
    } else result.push({ color: cells[x], count: 1, from: x, to: x });
  }
  return result;
}
export function blankPiece(
  template: Template,
  width: number,
  height: number,
): Piece {
  return {
    id: uid(),
    name: template === "tote" ? "Front panel" : "Main panel",
    construction: "flat",
    template,
    width,
    height,
    chart: Array.from({ length: height }, () => Array(width).fill("cream")),
    removable: Array.from({ length: height }, () => Array(width).fill(true)),
    background: "cream",
    stitch: template === "beanie" ? "hdc" : "sc",
    blo: template === "beanie",
    start: "left",
    crownEdge: "left",
    foundationAuto: true,
    foundation: `Chain ${width + (template === "beanie" ? 2 : 1)}. Work ${width} ${template === "beanie" ? "half double crochet" : "single crochet"} stitches into the foundation chain; the turning chain does not count.`,
    turning:
      template === "beanie"
        ? "Chain 2 and turn; turning chain does not count as a stitch."
        : "Chain 1 and turn; turning chain does not count as a stitch.",
    finishing: "Fasten off and weave in the ends.",
    motifs: [],
    rowRefs: Array.from({ length: height }, (_, i) => ({
      sourceRow: i + 1,
      origin: "user",
    })),
    approvedEdges: { left: true, right: true, top: true, bottom: true },
    border: 0,
    repeatX: 1,
    repeatY: 1,
    seam: "left",
    fitAllowance: 0,
    brimAllowance: 0,
    orientation:
      template === "beanie"
        ? "Stitches: crown → brim · Rows: around the head"
        : "Stitches: left → right · Rows: bottom → top",
  };
}
export const palette: Yarn[] = [
  { id: "cream", name: "Oat", hex: "#e8dfcf", symbol: "·" },
  { id: "olive", name: "Moss", hex: "#65745a", symbol: "M" },
  { id: "clay", name: "Terracotta", hex: "#be785e", symbol: "T" },
  { id: "black", name: "Black", hex: "#30312d", symbol: "B" },
  { id: "red", name: "Red", hex: "#bb4444", symbol: "R" },
];
const flower = [
  "00011000",
  "00122100",
  "01222210",
  "01233210",
  "00133100",
  "00011000",
  "00044000",
  "00444000",
  "00044000",
  "00044000",
];
export function plant(p: Piece, x: number, y: number, scale = 1) {
  const colors = ["cream", "clay", "clay", "cream", "olive"];
  flower.forEach((row, dy) =>
    [...row].forEach((c, dx) => {
      if (c === "0") return;
      for (let a = 0; a < scale; a++)
        for (let b = 0; b < scale; b++) {
          const xx = x + dx * scale + a,
            yy = y + dy * scale + b;
          if (p.chart[yy]?.[xx]) {
            p.chart[yy][xx] = colors[+c];
            p.removable[yy][xx] = false;
          }
        }
    }),
  );
}
export const templateNames: Record<Template, string> = {
  beanie: "Side-to-side beanie",
  blanket: "Blanket / wall hanging",
  scarf: "Scarf",
  cushion: "Cushion panel",
  tote: "Tote panels",
  custom: "Blank canvas",
};
export function createProject(
  template: Template,
  name?: string,
  example = false,
): Project {
  const dimensions: Record<Template, [number, number]> = {
    beanie: [40, 24],
    blanket: [36, 32],
    scarf: [24, 44],
    cushion: [32, 32],
    tote: [32, 36],
    custom: [32, 32],
  };
  const [w, h] = dimensions[template];
  const p = blankPiece(template, w, h);
  if (template === "beanie") {
    p.background = "black";
    p.chart = p.chart.map(() => Array(w).fill("black"));
    p.chart[0] = [
      ...Array(8).fill("black"),
      ...Array(8).fill("red"),
      ...Array(24).fill("black"),
    ];
    p.chart[1] = [
      ...Array(9).fill("black"),
      ...Array(9).fill("red"),
      ...Array(22).fill("black"),
    ];
    for (let y = 2; y < 19; y++) {
      for (let x = 7; x < 19; x++)
        if ((x + y) % 7 < 3) {
          p.chart[y][x] = "red";
        }
    }
    p.removable = p.chart.map((row) => row.map((c) => c === "black"));
    p.motifs = [
      {
        id: uid(),
        name: "Crown graphic",
        bounds: { x: 7, y: 0, w: 12, h: 19 },
        anchor: "left",
        rowAnchor: "top",
        offsetX: 0,
        offsetY: 0,
        offsetUnit: "cells",
        policy: "pixels",
      },
    ];
    p.approvedEdges.left = false;
    p.gauge = {
      stitches: 20,
      rows: 16,
      stitchDistance: 10,
      rowDistance: 10,
      unit: "cm",
      hook: "5 mm",
      yarn: "Swatch example — replace with your measured gauge",
      state: "unwashed",
    };
  } else if (template !== "custom") {
    const x = Math.floor((w - 16) / 2),
      y = template === "scarf" ? 4 : Math.floor((h - 20) / 2);
    plant(p, x, y, 2);
    p.motifs = [
      {
        id: uid(),
        name: "Little bloom",
        bounds: { x, y, w: 16, h: 20 },
        anchor: "center",
        rowAnchor: template === "scarf" ? "top" : "center",
        offsetX: 0,
        offsetY: 0,
        offsetUnit: "cells",
        policy: "pixels",
      },
    ];
  }
  if (template === "beanie" && !example) p.gauge = undefined;
  const pieces = [p];
  if (template === "tote") {
    const back = blankPiece(template, w, h);
    back.name = "Back panel";
    pieces.push(back);
  }
  const assembly: Record<Template, string> = {
    beanie:
      "Draft assembly: lay the panel so the rows wrap around the head. Join the first and last row edges. Gather the crown edge (stitch 1). Check fit and crown closure on a physical sample before use; optional fold-up brim must be allowed for in the stitch axis.",
    blanket:
      "Block the flat panel to your chosen dimensions. For a wall hanging, attach the top edge to a dowel using your chosen joining method.",
    scarf:
      "Block the flat panel. Add optional fringe only after the fabric is complete.",
    cushion:
      "This template is one flat cushion face. Make or supply a matching back, join three edges, insert the cushion, and close the final edge using a chosen method.",
    tote: "Join the sides and bottom of the two panels, leaving the top open. Handles and lining are not generated; add your own tested instructions before use.",
    custom: "",
  };
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: uid(),
    name:
      name ||
      {
        beanie: "Crown-anchored beanie",
        blanket: "Little bloom wall hanging",
        scarf: "The slow Sunday scarf",
        cushion: "Bloom cushion",
        tote: "Market morning tote",
        custom: "Untitled design",
      }[template],
    template,
    created: now,
    updated: now,
    revision: 1,
    palette: clone(palette),
    pieces,
    assembly: assembly[template],
    notes: "",
    terminology: "US",
    issues: [],
    revisions: [],
    example,
    adapted: false,
    source: example
      ? {
          kind: "example",
          text: "Authored demonstration data. Template construction requires physical crochet review.",
          attribution: "Crochet Studio example",
          timed: [],
        }
      : undefined,
  };
}
export function initialLibrary(): Library {
  const examples = [
    createProject("blanket", undefined, true),
    createProject("beanie", "40 → 60 · crown study", true),
    createProject("tote", undefined, true),
    createProject("scarf", undefined, true),
  ];
  const tutorial = createProject("custom", "Synthetic tutorial study", true);
  tutorial.source = {
    kind: "example",
    text: "00:12 Foundation\n00:35 Row 1\n01:10 Row 2",
    attribution: "Synthetic timestamps; not fetched from a video",
    timed: [
      { time: 12, text: "Foundation" },
      { time: 35, text: "Row 1" },
      { time: 70, text: "Row 2" },
    ],
  };
  tutorial.pieces = [blankPiece("custom", 16, 12)];
  plant(tutorial.pieces[0], 4, 1);
  tutorial.pieces[0].rowRefs[0].timestamp = 35;
  tutorial.pieces[0].rowRefs[1].timestamp = 70;
  examples.push(tutorial);
  return {
    schemaVersion: 1,
    projects: examples,
    settings: {
      theme: "system",
      beginner: false,
      hand: "right",
      symbols: false,
    },
  };
}
export function revise(p: Project, label: string): Project {
  const next = clone(p);
  next.revisions = [
    ...p.revisions,
    { number: p.revision, at: p.updated, label, pieces: clone(p.pieces) },
  ].slice(-15);
  next.revision++;
  next.updated = new Date().toISOString();
  return next;
}
