import {
  blankPiece,
  uid,
  clone,
  palette,
  type Project,
  type Issue,
  type Edge,
  type RowRef,
  type Yarn,
} from "./model";
export function youtubeId(input: string): string | undefined {
  try {
    const u = new URL(input);
    if (!["https:", "http:"].includes(u.protocol)) return;
    let id: string | null = null;
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    ) {
      id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1] || null;
    } else if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    return id && /^[\w-]{11}$/.test(id) ? id : undefined;
  } catch {
    return;
  }
}
export function captions(text: string): { time: number; text: string }[] {
  const time = (s: string) => {
    const nums = s.replace(",", ".").split(":").map(Number);
    return nums.reduce((a, n) => a * 60 + n, 0);
  };
  const out: { time: number; text: string }[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->/);
    if (m) {
      const content: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].trim())
        content.push(lines[++i].replace(/<[^>]*>/g, ""));
      out.push({ time: time(m[1]), text: content.join(" ") });
    }
  }
  if (!out.length) {
    for (const line of lines) {
      const m = line.match(/^\[?((?:\d{1,2}:)?\d{2}:\d{2})\]?\s+(.+)$/);
      if (m) out.push({ time: time(m[1]), text: m[2] });
    }
  }
  return out;
}
export const importExample =
  "Row 1 [crown-to-brim]: 8 Black, 8 Red, 24 Black\nRow 2 [brim-to-crown]: 22 Black, 9 Red, 9 Black";
export interface ParseOptions {
  start?: Edge;
  stitch: "sc" | "hdc";
  blo: boolean;
  turningConfirmed: boolean;
  terminology: "US" | "UK";
  tutorialUrl?: string;
  attribution: string;
}
export function parsePattern(
  text: string,
  o: ParseOptions,
): { project: Project; recognized: number } {
  const issues: Issue[] = [];
  const add = (message: string) =>
    issues.push({ id: uid(), message, resolved: false });
  const ys: Yarn[] = clone(palette);
  const timed = captions(text);
  const rawLines = timed.length
    ? timed.flatMap((c) =>
        c.text.split(/\n/).map((t) => ({ text: t, time: c.time })),
      )
    : text.split(/\r?\n/).map((t) => ({ text: t, time: undefined }));
  const rows: { n: number; cells: string[]; edge?: Edge; time?: number }[] = [];
  for (const line of rawLines) {
    const match = line.text
      .trim()
      .match(/^Row\s+(\d+)\s*(?:\[([^\]]+)\])?\s*:\s*(.+)$/i);
    if (!match) {
      if (line.text.trim() && !/^WEBVTT|^\d+$/.test(line.text.trim()))
        add(
          `Not parsed: “${line.text.slice(0, 90)}”. Keep as source and manually complete.`,
        );
      continue;
    }
    const metadata = match[2]?.toLowerCase();
    const edge: Edge | undefined = ["crown-to-brim", "left-to-right"].includes(
      metadata || "",
    )
      ? "left"
      : ["brim-to-crown", "right-to-left"].includes(metadata || "")
        ? "right"
        : undefined;
    if (metadata && !edge)
      add(`Row ${match[1]} has unsupported direction metadata.`);
    const cells: string[] = [];
    for (const part of match[3].split(",")) {
      const run = part.trim().match(/^(\d+)\s+([a-z][a-z -]*)$/i);
      if (!run) {
        add(
          `Row ${match[1]} contains unsupported counts, repeats, or shaping: “${part.trim()}”.`,
        );
        continue;
      }
      const count = Number(run[1]);
      if (count < 1 || count > 200) {
        add(`Row ${match[1]}: counts must be 1–200.`);
        continue;
      }
      const name = run[2].trim();
      let yarn = ys.find(
        (y) =>
          y.name.toLowerCase() === name.toLowerCase() ||
          y.id === name.toLowerCase(),
      );
      if (!yarn) {
        add(
          `Unknown color “${name}”. A provisional swatch was added; review it in the palette.`,
        );
        yarn = {
          id: uid(),
          name,
          hex: "#9b9390",
          symbol: String(ys.length + 1),
        };
        ys.push(yarn);
      }
      cells.push(...Array(count).fill(yarn.id));
    }
    rows.push({ n: +match[1], cells, edge, time: line.time });
  }
  if (!rows.length)
    add(
      "No structured rows found. The source is stored for manual transcription.",
    );
  if (!o.start && !rows[0]?.edge)
    add("Missing starting direction. Confirm the physical starting edge.");
  if (!o.turningConfirmed)
    add(
      "Turning-chain count is unresolved. Confirm that the turning chain does not count before adaptation.",
    );
  if (/\b(round|increase|decrease|inc|dec|c2c|filet|amigurumi)\b/i.test(text))
    add(
      "Unsupported shaping or construction detected. Automatic resizing is disabled; store and manually edit the source.",
    );
  if (rows.length > 200)
    add(
      "Only the first 200 rows are charted. Source exceeds the 200-row limit.",
    );
  const width = Math.max(1, Math.min(200, rows[0]?.cells.length || 32)),
    height = Math.max(1, Math.min(200, rows.length));
  const p = blankPiece("custom", width, height);
  p.stitch = o.stitch;
  p.blo = o.blo;
  p.start = rows[0]?.edge || o.start || "left";
  p.background = rows[0]?.cells[0] || "cream";
  p.foundation = "";
  p.foundationAuto = false;
  p.turning = "";
  p.finishing = "";
  p.motifs = [];
  const refs: RowRef[] = [];
  rows.slice(0, 200).forEach((r, i) => {
    if (r.n !== i + 1)
      add(
        `Expected row ${i + 1}, found row ${r.n}. Check missing or duplicate rows.`,
      );
    if (r.cells.length !== width)
      add(
        `Row ${r.n} totals ${r.cells.length}; expected ${width}. Review chart padding/truncation.`,
      );
    const expected = i % 2 ? (p.start === "left" ? "right" : "left") : p.start;
    if (r.edge && r.edge !== expected)
      add(
        `Row ${r.n} direction does not alternate. This construction needs manual review.`,
      );
    const edge = r.edge || expected;
    const physical = edge === "right" ? [...r.cells].reverse() : r.cells;
    p.chart[i] = Array.from(
      { length: width },
      (_, x) => physical[x] || p.background,
    );
    refs.push({ sourceRow: r.n, timestamp: r.time, origin: "source" });
  });
  p.rowRefs = refs.length ? refs : [{ origin: "user" }];
  p.removable = p.chart.map((row) => row.map((c) => c === p.background));
  if (/\b(round|increase|decrease|inc|dec|c2c|filet|amigurumi)\b/i.test(text))
    p.construction = "unsupported";
  const now = new Date().toISOString();
  return {
    recognized: rows.length,
    project: {
      schemaVersion: 1,
      id: uid(),
      name: o.tutorialUrl ? "Tutorial study" : "Imported pattern",
      template: "custom",
      created: now,
      updated: now,
      revision: 1,
      palette: ys,
      pieces: [p],
      assembly: "",
      notes: "",
      terminology: o.terminology,
      issues,
      revisions: [],
      example: false,
      adapted: false,
      source: {
        kind: o.tutorialUrl ? "tutorial" : "written",
        text,
        url: o.tutorialUrl,
        videoId: o.tutorialUrl ? youtubeId(o.tutorialUrl) : undefined,
        attribution: o.attribution,
        timed,
      },
    },
  };
}
export interface ImageOptions {
  width: number;
  height: number;
  colors: number;
  crop: { x: number; y: number; w: number; h: number };
}
export async function imageToChart(
  dataURL: string,
  o: ImageOptions,
): Promise<{ chart: string[][]; palette: Yarn[] }> {
  const img = new Image();
  img.src = dataURL;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Image conversion is unavailable in this browser.");
  const crop = o.crop;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, o.width, o.height);
  ctx.drawImage(
    img,
    (img.width * crop.x) / 100,
    (img.height * crop.y) / 100,
    (img.width * crop.w) / 100,
    (img.height * crop.h) / 100,
    0,
    0,
    o.width,
    o.height,
  );
  const pixels = ctx.getImageData(0, 0, o.width, o.height).data;
  const buckets = new Map<string, { rgb: number[]; count: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]].map(
      (n) => Math.round(n / 32) * 32,
    );
    const key = rgb.join(",");
    const old = buckets.get(key);
    buckets.set(key, {
      rgb: rgb.map((n) => Math.min(n, 255)),
      count: (old?.count || 0) + 1,
    });
  }
  const centers = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, o.colors)
    .map((b) => b.rgb);
  const pal = centers.map((rgb, i) => ({
    id: `image-${i}`,
    name: `Image yarn ${i + 1}`,
    hex: "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join(""),
    symbol: String(i + 1),
  }));
  const chart = Array.from({ length: o.height }, (_, y) =>
    Array.from({ length: o.width }, (_, x) => {
      const i = (y * o.width + x) * 4;
      let best = 0,
        distance = Infinity;
      centers.forEach((rgb, j) => {
        const d = rgb.reduce((a, n, k) => a + (n - pixels[i + k]) ** 2, 0);
        if (d < distance) {
          best = j;
          distance = d;
        }
      });
      return pal[best].id;
    }),
  );
  return { chart, palette: pal };
}
