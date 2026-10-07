import { contrast, yarnText } from "./color";
import { describe, it, expect } from "vitest";
import {
  blankPiece,
  createProject,
  runs,
  direction,
  cm,
  gaugeRates,
  clone,
  initialLibrary,
  type Gauge,
} from "./model";
import {
  resizePiece,
  countsForSize,
  physicalSize,
  assertConsistency,
} from "./resize";
import { parsePattern, importExample, youtubeId, captions } from "./imports";
import { decodeProject } from "./storage";
import {
  startSession,
  guideSteps,
  completeStep,
  undoCompletion,
  writtenRows,
} from "./guide";
import { flood, transform, paintCell } from "./editor";
const gauge: Gauge = {
  stitches: 20,
  rows: 16,
  stitchDistance: 10,
  rowDistance: 10,
  unit: "cm",
  hook: "5 mm",
  yarn: "test",
  state: "washed",
};
const opts = {
  stitch: "hdc" as const,
  blo: true,
  turningConfirmed: true,
  terminology: "US" as const,
  attribution: "Test source",
};
function imported() {
  return parsePattern(importExample, opts).project;
}
describe("deterministic resizing in physical coordinates", () => {
  it("produces the exact required working rows at 60 stitches", () => {
    const p = imported().pieces[0];
    const result = resizePiece(p, {
      width: 60,
      height: 2,
      xPlacement: "left",
      prefixRows: 0,
    });
    expect(result.conflicts).toEqual([]);
    const n = result.piece!;
    expect(runs(n, 0).map((r) => [r.count, r.color])).toEqual([
      [8, "black"],
      [8, "red"],
      [44, "black"],
    ]);
    expect(runs(n, 1).map((r) => [r.count, r.color])).toEqual([
      [42, "black"],
      [9, "red"],
      [9, "black"],
    ]);
    expect(runs(n, 0).reduce((a, r) => a + r.count, 0)).toBe(60);
    expect(runs(n, 1).reduce((a, r) => a + r.count, 0)).toBe(60);
  });
  it.each(["left", "right"] as const)(
    "preserves crown anchoring when first direction is %s",
    (start) => {
      const p = imported().pieces[0];
      p.start = start;
      const n = resizePiece(p, {
        width: 60,
        height: 2,
        xPlacement: "left",
        prefixRows: 0,
      }).piece!;
      expect(n.chart[0].slice(0, 40)).toEqual(p.chart[0]);
      expect(direction(n, 0)).toBe(start);
      expect(direction(n, 1)).not.toBe(start);
    },
  );
  it("prefix rows update parity and retain original references", () => {
    const p = imported().pieces[0];
    const n = resizePiece(p, {
      width: 40,
      height: 5,
      xPlacement: "left",
      prefixRows: 1,
    }).piece!;
    expect(n.start).toBe("right");
    expect(direction(n, 1)).toBe("left");
    expect(n.rowRefs[1].sourceRow).toBe(1);
    expect(n.rowRefs[0].origin).toBe("calculated");
    expect(n.chart[1]).toEqual(p.chart[0]);
  });
  it("does not merge a motif-colored brim edge into background padding", () => {
    const p = blankPiece("beanie", 3, 1);
    p.background = "black";
    p.chart = [["black", "black", "red"]];
    p.removable = [[true, true, false]];
    p.start = "right";
    const n = resizePiece(p, {
      width: 5,
      height: 1,
      xPlacement: "left",
      prefixRows: 0,
    }).piece!;
    expect(runs(n, 0).map((r) => [r.count, r.color])).toEqual([
      [2, "black"],
      [1, "red"],
      [2, "black"],
    ]);
  });
  it("rejects removal of unapproved painted background", () => {
    const p = paintCell(blankPiece("custom", 4, 2), 3, 0, "cream");
    expect(
      resizePiece(p, {
        width: 3,
        height: 2,
        xPlacement: "left",
        prefixRows: 0,
      }).conflicts.join(),
    ).toContain("protected");
  });
  it("rejects cropping protected artwork", () => {
    const p = blankPiece("custom", 5, 2);
    p.chart[0][4] = "red";
    p.removable[0][4] = false;
    expect(
      resizePiece(p, { width: 4, height: 2, xPlacement: "left", prefixRows: 0 })
        .piece,
    ).toBeUndefined();
  });
  it("allows only explicit safe background reductions", () => {
    const p = blankPiece("custom", 5, 2);
    expect(
      resizePiece(p, { width: 3, height: 2, xPlacement: "left", prefixRows: 0 })
        .piece?.width,
    ).toBe(3);
  });
  it("rejects impossible protected motif sizes", () => {
    const p = createProject("beanie").pieces[0];
    const r = resizePiece(p, {
      width: 12,
      height: 24,
      xPlacement: "left",
      prefixRows: 0,
    });
    expect(r.piece).toBeUndefined();
    expect(r.conflicts.join()).toContain("motif");
  });
  it("honors approved edges", () => {
    const p = createProject("beanie").pieces[0];
    expect(
      resizePiece(p, {
        width: 60,
        height: 24,
        xPlacement: "center",
        prefixRows: 0,
      }).conflicts.join(),
    ).toContain("left edge");
  });
  it("honors protected borders", () => {
    const p = blankPiece("custom", 5, 5);
    p.border = 1;
    expect(
      resizePiece(p, {
        width: 4,
        height: 5,
        xPlacement: "left",
        prefixRows: 0,
      }).conflicts.join(),
    ).toContain("border");
  });
  it("rounds up valid repeats", () => {
    const p = blankPiece("custom", 4, 4);
    p.repeatX = 4;
    p.repeatY = 2;
    const r = resizePiece(p, {
      width: 9,
      height: 5,
      xPlacement: "left",
      prefixRows: 0,
    });
    expect(r.piece?.width).toBe(12);
    expect(r.piece?.height).toBe(6);
    expect(r.warnings.join()).toContain("repeat");
  });
  it("rejects negative, non-finite, huge counts and invalid prefix", () => {
    const p = blankPiece("custom", 5, 5);
    for (const width of [-1, 0, Infinity, NaN, 201])
      expect(
        resizePiece(p, { width, height: 5, xPlacement: "left", prefixRows: 0 })
          .piece,
      ).toBeUndefined();
    expect(
      resizePiece(p, { width: 5, height: 7, xPlacement: "left", prefixRows: 4 })
        .piece,
    ).toBeUndefined();
  });
  it("centres protected motifs without changing cells", () => {
    const p = createProject("blanket").pieces[0];
    const n = resizePiece(p, {
      width: 46,
      height: 42,
      xPlacement: "center",
      prefixRows: 5,
    }).piece!;
    expect(n.motifs[0].bounds.x).toBe(p.motifs[0].bounds.x + 5);
    expect(n.motifs[0].bounds.y).toBe(p.motifs[0].bounds.y + 5);
    expect(n.chart.slice(5, 37).map((r) => r.slice(5, 41))).toEqual(p.chart);
  });
  it("uses distinct gauge ratios for physical motif sizing", () => {
    const p = createProject("blanket").pieces[0];
    p.gauge = gauge;
    p.motifs[0].policy = "physical";
    const n = resizePiece(p, {
      width: 60,
      height: 64,
      xPlacement: "center",
      prefixRows: 16,
      newGauge: { ...gauge, stitches: 30, rows: 32 },
    }).piece!;
    expect(n.motifs[0].bounds.w).toBe(24);
    expect(n.motifs[0].bounds.h).toBe(40);
    expect(
      n.chart.flat().every((c) => ["cream", "clay", "olive"].includes(c)),
    ).toBe(true);
  });
  it("requires original and target gauge for physical policy", () => {
    const p = createProject("blanket").pieces[0];
    p.motifs[0].policy = "physical";
    expect(
      resizePiece(p, {
        width: 50,
        height: 40,
        xPlacement: "center",
        prefixRows: 4,
      }).conflicts.join(),
    ).toContain("gauges");
  });
  it("never modifies the original", () => {
    const p = createProject("beanie").pieces[0],
      backup = clone(p);
    resizePiece(p, {
      width: 60,
      height: 24,
      xPlacement: "left",
      prefixRows: 0,
    });
    expect(p).toEqual(backup);
  });
  it("unsupported constructions stay disabled", () => {
    const p = blankPiece("custom", 4, 4);
    p.construction = "unsupported";
    expect(
      resizePiece(p, { width: 8, height: 4, xPlacement: "left", prefixRows: 0 })
        .piece,
    ).toBeUndefined();
  });
});
describe("gauge, counts and axis mapping", () => {
  it("converts inches without losing the original input", () => {
    expect(cm(1, "in")).toBe(2.54);
    const g = {
      ...gauge,
      stitchDistance: 4,
      rowDistance: 4,
      unit: "in" as const,
    };
    expect(gaugeRates(g).x).toBeCloseTo(20 / 10.16);
    expect(g.unit).toBe("in");
  });
  it("maps beanie stitches to length and rows to circumference", () => {
    expect(countsForSize(gauge, 30, 50, "cm")).toEqual({
      width: 60,
      height: 80,
    });
    expect(countsForSize(gauge, 30, 50, "cm", -2, 5)).toEqual({
      width: 70,
      height: 77,
    });
  });
  it("reports achievable measurements from counts", () => {
    const p = blankPiece("beanie", 60, 80);
    p.gauge = gauge;
    expect(physicalSize(p)).toEqual({ x: 30, y: 50 });
    expect(physicalSize(p, "in")?.x).toBeCloseTo(30 / 2.54);
  });
  it("missing gauge has no invented dimensions", () => {
    expect(physicalSize(blankPiece("custom", 10, 10))).toBeUndefined();
  });
});
describe("reviewed imports and source references", () => {
  it("parses supported directions and colors without issues", () => {
    expect(imported().issues).toEqual([]);
  });
  it("flags ambiguous direction and turning chain", () => {
    const p = parsePattern("Row 1: 3 Red", {
      ...opts,
      turningConfirmed: false,
    }).project;
    expect(p.issues.map((i) => i.message).join()).toContain(
      "starting direction",
    );
    expect(p.issues.map((i) => i.message).join()).toContain("Turning-chain");
  });
  it("flags row totals, unknown colors, gaps, and repeats", () => {
    const p = parsePattern(
      "Row 1: 3 Purple\nRow 3: 2 Red, repeat twice",
      opts,
    ).project;
    expect(p.issues.length).toBeGreaterThanOrEqual(4);
  });
  it("stores unsupported narration rather than fabricating a pattern", () => {
    const p = parsePattern(
      "Work in rounds and increase each time.",
      opts,
    ).project;
    expect(p.pieces[0].construction).toBe("unsupported");
    expect(p.source?.text).toContain("rounds");
    expect(p.issues.length).toBeGreaterThan(0);
  });
  it("SRT and VTT preserve timestamps", () => {
    for (const t of [
      "1\n00:00:12,500 --> 00:00:15,000\nRow 1: 3 Red\n",
      "WEBVTT\n\n00:12.500 --> 00:15.000\nRow 1: 3 Red\n",
    ]) {
      expect(captions(t)[0]).toEqual({ time: 12.5, text: "Row 1: 3 Red" });
      const p = parsePattern(t, { ...opts, start: "left" }).project;
      expect(p.pieces[0].rowRefs[0].timestamp).toBe(12.5);
    }
  });
  it("untimed text never gets a fabricated time", () => {
    expect(imported().pieces[0].rowRefs[0].timestamp).toBeUndefined();
    expect(imported().source?.timed).toEqual([]);
  });
  it("YouTube IDs are validated against trusted hosts and protocols", () => {
    expect(youtubeId("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
    expect(youtubeId("https://www.youtube.com/watch?v=abcdefghijk")).toBe(
      "abcdefghijk",
    );
    expect(
      youtubeId("https://youtube.com.evil.test/watch?v=abcdefghijk"),
    ).toBeUndefined();
    expect(youtubeId("javascript:alert(1)")).toBeUndefined();
    expect(youtubeId("https://youtu.be/short")).toBeUndefined();
  });
});
describe("charts, sessions, editing and portable backups", () => {
  it.each(["beanie", "blanket", "scarf", "tote", "cushion"] as const)(
    "%s template has valid charts and actionable construction",
    (t) => {
      const p = createProject(t);
      for (const piece of p.pieces) {
        expect(assertConsistency(piece)).toBe(true);
        expect(piece.foundation).toBeTruthy();
        expect(piece.turning).toBeTruthy();
        expect(
          writtenRows(piece, p.palette).every((r) => r.total === piece.width),
        ).toBe(true);
      }
      expect(p.assembly).toBeTruthy();
    },
  );
  it("sessions freeze pieces, palette and assembly", () => {
    const p = imported();
    const s = startSession(p, "row");
    p.pieces[0].chart[0][0] = "red";
    p.palette[0].name = "Different";
    p.assembly = "Changed";
    expect(s.pieces[0].chart[0][0]).toBe("black");
    expect(s.palette[0].name).toBe("Oat");
    expect(s.assembly).toBe("");
  });
  it("completion, previous, and undo have distinct progress behavior", () => {
    const s = startSession(imported(), "row");
    const n = completeStep(s);
    expect(n.completed).toBe(1);
    expect(n.cursor).toBe(1);
    const previous = { ...n, cursor: 0 };
    expect(previous.completed).toBe(1);
    expect(undoCompletion(n).completed).toBe(0);
  });
  it("beginner preference and practice navigation are outside session progress", () => {
    const lib = initialLibrary(),
      s = startSession(lib.projects[0], "row");
    const before = clone(s);
    lib.settings.beginner = true;
    expect(s).toEqual(before);
    expect("beginner" in s).toBe(false);
  });
  it("includes foundation, turns, finishing and assembly only if specified", () => {
    const p = createProject("custom");
    const s = startSession(p, "row");
    const kinds = guideSteps(s).map((x) => x.kind);
    expect(kinds).toContain("foundation");
    expect(kinds).toContain("turn");
    expect(kinds).toContain("finishing");
    p.pieces[0].foundation = "";
    p.pieces[0].turning = "";
    p.pieces[0].finishing = "";
    expect(
      guideSteps(startSession(p, "row")).every((x) => x.kind === "row"),
    ).toBe(true);
  });
  it("block mode comes from working-order runs", () => {
    const s = startSession(imported(), "block");
    const steps = guideSteps(s).filter((x) => x.kind === "block");
    expect(steps.map((x) => x.count)).toEqual([8, 8, 24, 22, 9, 9]);
  });
  it("flood fill is connected and artwork stays protected", () => {
    const p = blankPiece("custom", 3, 2);
    p.chart[0][1] = "red";
    p.chart[1][1] = "red";
    const n = flood(p, 0, 0, "olive");
    expect(n.chart[0]).toEqual(["olive", "red", "cream"]);
    expect(n.removable[0][0]).toBe(false);
  });
  it("selection copying and mirroring use source snapshot", () => {
    const p = blankPiece("custom", 4, 1);
    p.chart[0] = ["red", "black", "cream", "cream"];
    expect(
      transform(p, { x: 0, y: 0, w: 2, h: 1 }, "copy", 2, 0).chart[0],
    ).toEqual(["red", "black", "red", "black"]);
    expect(
      transform(p, { x: 0, y: 0, w: 2, h: 1 }, "mirrorX").chart[0],
    ).toEqual(["black", "red", "cream", "cream"]);
    expect(() =>
      transform(p, { x: 0, y: 0, w: 2, h: 1 }, "move", 3, 0),
    ).toThrow();
  });
  it("export/import round trip retains a session", () => {
    const p = createProject("beanie");
    p.session = completeStep(startSession(p, "block"));
    expect(decodeProject(JSON.stringify(p))).toEqual(p);
  });
  it("rejects malformed projects and future schemas", () => {
    expect(() => decodeProject('{"schemaVersion":2}')).toThrow("schema");
    const p = createProject("custom");
    p.pieces[0].chart[0].pop();
    expect(() => decodeProject(JSON.stringify(p))).toThrow("disagree");
  });
});

describe("review protection and backup boundaries", () => {
  it("never regenerates a user-authored foundation", () => {
    const p = blankPiece("custom", 4, 4);
    p.foundation = "My protected chain and special edging";
    p.foundationAuto = false;
    const r = resizePiece(p, {
      width: 6,
      height: 4,
      xPlacement: "left",
      prefixRows: 0,
    });
    expect(r.piece?.foundation).toBe(p.foundation);
    expect(r.warnings.join()).toContain("retained unchanged");
  });
  it("never invents turning-chain length from imported chart rows", () => {
    expect(imported().pieces[0].turning).toBe("");
  });
  it("rejects malicious source links and external image URLs in backups", () => {
    const p = createProject("custom");
    p.source = {
      kind: "tutorial",
      text: "source",
      attribution: "test",
      timed: [],
      url: "javascript:alert(1)",
    };
    expect(() => decodeProject(JSON.stringify(p))).toThrow("YouTube");
    p.source = {
      kind: "image",
      text: "source",
      attribution: "test",
      timed: [],
      originalImage: "https://evil.test/image.png",
    };
    expect(() => decodeProject(JSON.stringify(p))).toThrow("local raster");
  });
  it("rejects frozen progress outside the guide", () => {
    const p = imported();
    p.session = startSession(p, "row");
    p.session.cursor = 99999;
    expect(() => decodeProject(JSON.stringify(p))).toThrow("outside");
  });
});

describe("motif editing and measured offsets", () => {
  it("moves named motif geometry with a complete artwork selection", () => {
    const p = createProject("blanket").pieces[0],
      b = p.motifs[0].bounds;
    const n = transform(p, b, "move", 2, 1);
    expect(n.motifs[0].bounds.x).toBe(b.x + 2);
    expect(n.motifs[0].bounds.y).toBe(b.y + 1);
  });
  it("manual edits retain source references but record user origin", () => {
    const p = imported().pieces[0];
    const n = paintCell(p, 0, 0, "red");
    expect(n.rowRefs[0].sourceRow).toBe(1);
    expect(n.rowRefs[0].origin).toBe("user");
  });
  it("rounds physical motif offsets using target measured gauge", () => {
    const p = createProject("blanket").pieces[0];
    p.gauge = gauge;
    p.motifs[0].offsetUnit = "cm";
    p.motifs[0].offsetX = 1.2;
    p.motifs[0].offsetY = 0.8;
    const r = resizePiece(p, {
      width: 50,
      height: 44,
      xPlacement: "center",
      prefixRows: 6,
      newGauge: gauge,
    });
    expect(r.piece?.motifs[0].bounds.x).toBe(19);
    expect(r.piece?.motifs[0].bounds.y).toBe(13);
    expect(r.warnings.join()).toContain("offsets rounded");
  });
  it("new beanies do not assume a measured gauge", () => {
    expect(createProject("beanie").pieces[0].gauge).toBeUndefined();
  });
});

describe("accessible yarn and interface contrast", () => {
  it("chooses readable text on every example yarn and image swatch", () => {
    for (const hex of [
      "#e8dfcf",
      "#65745a",
      "#be785e",
      "#30312d",
      "#bb4444",
      "#ffffff",
      "#000000",
      "#ff00ff",
      "#00ffff",
    ])
      expect(contrast(hex, yarnText(hex))).toBeGreaterThanOrEqual(4.5);
  });
  it("light and dark primary text, secondary text, and actions meet text contrast", () => {
    for (const [fg, bg] of [
      ["#252821", "#f7f5f0"],
      ["#6b6f63", "#f7f5f0"],
      ["#fffefb", "#526346"],
      ["#eeeee6", "#20231f"],
      ["#adb1a5", "#292d27"],
      ["#20231f", "#a8b997"],
    ])
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("rejects fractional cell movement without corrupting the grid", () => {
    expect(() =>
      transform(
        blankPiece("custom", 4, 4),
        { x: 0, y: 0, w: 1, h: 1 },
        "move",
        0.5,
        0,
      ),
    ).toThrow("whole");
  });
});
