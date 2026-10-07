import { SCHEMA, type Library, type Project } from "./model";
import { guideSteps } from "./guide";
import { youtubeId } from "./imports";
import { assertConsistency } from "./resize";
let dbPromise: Promise<IDBDatabase> | undefined;
function db() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("crochet-studio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("library");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {
      dbPromise = undefined;
      reject(r.error);
    };
    r.onblocked = () => {
      dbPromise = undefined;
      reject(new Error("Close other Crochet Studio tabs and try again."));
    };
  }));
}
export async function loadLibrary(): Promise<Library | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("library").objectStore("library").get("state");
    r.onsuccess = () => {
      try {
        if (r.result && r.result.schemaVersion !== SCHEMA)
          throw new Error(
            "This saved library uses an unsupported schema. Export a backup before changing versions.",
          );
        if (r.result) {
          if (
            !Array.isArray(r.result.projects) ||
            !r.result.settings ||
            !["system", "light", "dark"].includes(r.result.settings.theme)
          )
            throw new Error(
              "Saved library is malformed. Existing data has been left intact.",
            );
          r.result.projects.forEach((p: Project) =>
            decodeProject(JSON.stringify(p)),
          );
        }
        resolve(r.result);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function saveLibrary(state: Library) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("library", "readwrite");
    t.objectStore("library").put(state, "state");
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Save aborted."));
  });
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function decodeProject(text: string): Project {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new Error("This is not valid project JSON.");
  }
  if (!record(v) || v.schemaVersion !== 1)
    throw new Error(
      "Unsupported schema version. Expected a Crochet Studio v1 project.",
    );
  if (
    typeof v.name !== "string" ||
    v.name.length > 200 ||
    typeof v.id !== "string" ||
    !["beanie", "blanket", "scarf", "tote", "cushion", "custom"].includes(
      String(v.template),
    ) ||
    typeof v.created !== "string" ||
    typeof v.updated !== "string" ||
    !Number.isFinite(Date.parse(v.updated)) ||
    !Number.isFinite(Date.parse(v.created)) ||
    !Array.isArray(v.pieces) ||
    v.pieces.length < 1 ||
    v.pieces.length > 20 ||
    !Array.isArray(v.palette) ||
    v.palette.length < 1 ||
    v.palette.length > 64 ||
    !Array.isArray(v.issues) ||
    !Array.isArray(v.revisions) ||
    v.revisions.length > 15 ||
    !["US", "UK"].includes(String(v.terminology))
  )
    throw new Error(
      "Project fields are incomplete or exceed supported limits.",
    );
  const colors = new Set<string>();
  for (const c of v.palette) {
    if (
      !record(c) ||
      typeof c.id !== "string" ||
      typeof c.name !== "string" ||
      typeof c.symbol !== "string" ||
      typeof c.hex !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(c.hex) ||
      colors.has(c.id)
    )
      throw new Error("Invalid yarn palette.");
    colors.add(c.id);
  }
  for (const p of v.pieces) {
    if (
      !record(p) ||
      !Number.isInteger(p.width) ||
      !Number.isInteger(p.height) ||
      Number(p.width) < 1 ||
      Number(p.width) > 200 ||
      Number(p.height) < 1 ||
      Number(p.height) > 200 ||
      !Array.isArray(p.chart) ||
      !Array.isArray(p.removable) ||
      !Array.isArray(p.rowRefs) ||
      !Array.isArray(p.motifs) ||
      !record(p.approvedEdges) ||
      !["flat", "unsupported"].includes(String(p.construction)) ||
      !["sc", "hdc"].includes(String(p.stitch)) ||
      !["left", "right"].includes(String(p.start)) ||
      !colors.has(String(p.background)) ||
      typeof p.foundation !== "string" ||
      typeof p.turning !== "string" ||
      typeof p.finishing !== "string" ||
      !Number.isInteger(p.repeatX) ||
      Number(p.repeatX) < 1 ||
      !Number.isInteger(p.repeatY) ||
      Number(p.repeatY) < 1 ||
      typeof p.name !== "string" ||
      typeof p.foundationAuto !== "boolean" ||
      typeof p.blo !== "boolean" ||
      !Number.isInteger(p.border) ||
      Number(p.border) < 0 ||
      !["left", "right"].includes(String(p.seam)) ||
      !["left", "right"].includes(String(p.crownEdge)) ||
      Object.values(p.approvedEdges).some((x) => typeof x !== "boolean")
    )
      throw new Error("Invalid piece construction or dimensions.");
    if (
      !assertConsistency(p as unknown as Project["pieces"][number]) ||
      p.chart.some(
        (row: unknown) =>
          !Array.isArray(row) ||
          row.some((c) => typeof c !== "string" || !colors.has(c)),
      ) ||
      p.removable.some(
        (r: unknown) =>
          !Array.isArray(r) || r.some((c) => typeof c !== "boolean"),
      )
    )
      throw new Error("Chart, palette, and dimensions disagree.");
    for (const ref of p.rowRefs) {
      if (
        !record(ref) ||
        !["source", "calculated", "user"].includes(String(ref.origin)) ||
        (ref.timestamp !== undefined &&
          (typeof ref.timestamp !== "number" ||
            !Number.isFinite(ref.timestamp) ||
            ref.timestamp < 0))
      )
        throw new Error("Invalid source row reference.");
    }
    if (p.gauge) {
      if (
        !record(p.gauge) ||
        ![
          p.gauge.stitches,
          p.gauge.rows,
          p.gauge.stitchDistance,
          p.gauge.rowDistance,
        ].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) ||
        !["cm", "in"].includes(String(p.gauge.unit))
      )
        throw new Error("Invalid measured gauge.");
    }
    for (const m of p.motifs) {
      if (
        !record(m) ||
        !record(m.bounds) ||
        !["left", "right", "center", "seam"].includes(String(m.anchor)) ||
        !["top", "bottom", "center"].includes(String(m.rowAnchor)) ||
        !["pixels", "physical", "scale"].includes(String(m.policy)) ||
        typeof m.name !== "string" ||
        !["cells", "cm", "in"].includes(String(m.offsetUnit)) ||
        ![m.offsetX, m.offsetY].every(
          (n) => typeof n === "number" && Number.isFinite(n),
        ) ||
        ![m.bounds.x, m.bounds.y, m.bounds.w, m.bounds.h].every(
          (n) => typeof n === "number" && Number.isInteger(n),
        ) ||
        Number(m.bounds.x) < 0 ||
        Number(m.bounds.y) < 0 ||
        Number(m.bounds.w) < 1 ||
        Number(m.bounds.h) < 1 ||
        Number(m.bounds.x) + Number(m.bounds.w) > Number(p.width) ||
        Number(m.bounds.y) + Number(m.bounds.h) > Number(p.height)
      )
        throw new Error("Invalid protected motif.");
    }
  }
  // Imported sessions/history are validated recursively and cannot carry malformed frozen charts.
  if (v.session) {
    if (
      !record(v.session) ||
      !Array.isArray(v.session.pieces) ||
      !Array.isArray(v.session.palette) ||
      !["row", "block"].includes(String(v.session.mode)) ||
      ![v.session.cursor, v.session.completed, v.session.counter].every(
        (n) => typeof n === "number" && Number.isInteger(n) && n >= 0,
      )
    )
      throw new Error("Invalid crochet session.");
    if (
      typeof v.session.assembly !== "string" ||
      !["US", "UK"].includes(String(v.session.terminology)) ||
      typeof v.session.revision !== "number"
    )
      throw new Error("Invalid frozen metadata.");
    decodeProject(
      JSON.stringify({
        ...v,
        pieces: v.session.pieces,
        palette: v.session.palette,
        session: undefined,
        revisions: [],
        original: undefined,
      }),
    );
    const total = guideSteps(
      v.session as unknown as NonNullable<Project["session"]>,
    ).length;
    if (
      Number(v.session.cursor) >= total ||
      Number(v.session.completed) > total
    )
      throw new Error("Session progress is outside the frozen guide.");
  }
  for (const r of v.revisions) {
    if (!record(r) || !Array.isArray(r.pieces))
      throw new Error("Invalid revision.");
    decodeProject(
      JSON.stringify({
        ...v,
        pieces: r.pieces,
        revisions: [],
        session: undefined,
        original: undefined,
      }),
    );
  }
  if (v.original) {
    if (!Array.isArray(v.original)) throw new Error("Invalid original panels.");
    decodeProject(
      JSON.stringify({
        ...v,
        pieces: v.original,
        original: undefined,
        session: undefined,
        revisions: [],
      }),
    );
  }
  if (v.source) {
    if (
      !record(v.source) ||
      typeof v.source.text !== "string" ||
      typeof v.source.attribution !== "string" ||
      !Array.isArray(v.source.timed) ||
      !["written", "tutorial", "image", "example"].includes(
        String(v.source.kind),
      )
    )
      throw new Error("Invalid source metadata.");
    if (
      v.source.url &&
      (typeof v.source.url !== "string" || !youtubeId(v.source.url))
    )
      throw new Error("Source link must be a valid YouTube URL.");
    if (
      v.source.videoId &&
      (typeof v.source.videoId !== "string" ||
        !/^[\w-]{11}$/.test(v.source.videoId))
    )
      throw new Error("Invalid source video ID.");
    if (
      v.source.originalImage &&
      (typeof v.source.originalImage !== "string" ||
        !/^data:image\/(png|jpeg|webp|gif);base64,/.test(
          v.source.originalImage,
        ))
    )
      throw new Error("Original image must be a supported local raster.");
    for (const c of v.source.timed) {
      if (
        !record(c) ||
        typeof c.text !== "string" ||
        typeof c.time !== "number" ||
        !Number.isFinite(c.time) ||
        c.time < 0
      )
        throw new Error("Invalid caption timestamps.");
    }
  }
  for (const i of v.issues) {
    if (
      !record(i) ||
      typeof i.message !== "string" ||
      typeof i.id !== "string" ||
      typeof i.resolved !== "boolean"
    )
      throw new Error("Invalid review issue.");
  }
  if (
    typeof v.assembly !== "string" ||
    typeof v.notes !== "string" ||
    typeof v.revision !== "number" ||
    !Number.isInteger(v.revision)
  )
    throw new Error("Invalid project metadata.");
  return v as unknown as Project;
}
export function downloadProject(p: Project) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = p.name.replace(/[^\w -]/g, "").slice(0, 80) + ".crochet.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
