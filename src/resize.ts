import {
  clone,
  direction,
  gaugeRates,
  validGauge,
  type Piece,
  type Gauge,
  type Bounds,
} from "./model";
export interface ResizeOptions {
  width: number;
  height: number;
  xPlacement: "left" | "center" | "right";
  prefixRows: number;
  newGauge?: Gauge;
}
export interface ResizeResult {
  piece?: Piece;
  conflicts: string[];
  warnings: string[];
  added: number;
  removed: number;
  requested: { width: number; height: number };
}
const inside = (b: Bounds, x: number, y: number) =>
  x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
export function resizePiece(original: Piece, o: ResizeOptions): ResizeResult {
  const conflicts: string[] = [],
    warnings: string[] = [];
  const output: ResizeResult = {
    conflicts,
    warnings,
    added: 0,
    removed: 0,
    requested: { width: o.width, height: o.height },
  };
  if (original.construction !== "flat") {
    conflicts.push("Automatic resizing supports flat rectangular panels only.");
    return output;
  }
  if (
    ![o.width, o.height, o.prefixRows].every(Number.isFinite) ||
    o.width < 1 ||
    o.height < 1 ||
    o.width > 200 ||
    o.height > 200
  ) {
    conflicts.push("Use finite dimensions between 1 and 200 cells.");
    return output;
  }
  const w = Math.ceil(o.width / original.repeatX) * original.repeatX,
    h = Math.ceil(o.height / original.repeatY) * original.repeatY;
  if (w > 200 || h > 200) {
    conflicts.push("Repeat-rounded dimensions exceed the 200-cell axis limit.");
    return output;
  }
  if (w !== o.width || h !== o.height)
    warnings.push(
      `Rounded to the construction repeat: ${w} stitches × ${h} rows.`,
    );
  const dx = w - original.width,
    dy = h - original.height;
  const shiftX =
    o.xPlacement === "left"
      ? 0
      : o.xPlacement === "right"
        ? dx
        : Math.floor(dx / 2);
  const shiftY = Math.trunc(o.prefixRows);
  if (
    (dy >= 0 && (shiftY < 0 || shiftY > dy)) ||
    (dy < 0 && (shiftY > 0 || shiftY < dy))
  ) {
    conflicts.push(
      "Prefix rows must fit within the total row change. For removal, use a negative prefix count.",
    );
    return output;
  }
  const changes = {
    left: shiftX,
    right: dx - shiftX,
    top: shiftY,
    bottom: dy - shiftY,
  };
  for (const [edge, change] of Object.entries(changes))
    if (change !== 0 && !original.approvedEdges[edge as keyof typeof changes])
      conflicts.push(
        `${edge} edge is not approved for background padding or removal.`,
      );
  if (original.border > 0 && (dx < 0 || dy < 0))
    conflicts.push(
      "Protected border prevents reduction. Remove the border constraint only after reviewing construction.",
    );
  const p = clone(original);
  p.width = w;
  p.height = h;
  p.chart = Array.from({ length: h }, () => Array(w).fill(p.background));
  p.removable = Array.from({ length: h }, () => Array(w).fill(true));
  // Original non-motif fabric stays in physical coordinates; only explicitly safe cells may disappear.
  for (let y = 0; y < original.height; y++)
    for (let x = 0; x < original.width; x++) {
      if (original.motifs.some((m) => inside(m.bounds, x, y))) continue;
      const nx = x + shiftX,
        ny = y + shiftY;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        if (!original.removable[y][x])
          conflicts.push("Reduction would remove protected artwork or fabric.");
      } else {
        p.chart[ny][nx] = original.chart[y][x];
        p.removable[ny][nx] = original.removable[y][x];
      }
    }
  const occupied = new Set<string>();
  p.motifs = original.motifs.map((m) => {
    const b = m.bounds;
    let mw = b.w,
      mh = b.h;
    if (m.policy === "scale") {
      mw = Math.max(1, Math.round((b.w * w) / original.width));
      mh = Math.max(1, Math.round((b.h * h) / original.height));
    }
    if (m.policy === "physical") {
      if (!validGauge(original.gauge) || !validGauge(o.newGauge)) {
        conflicts.push(
          `“${m.name}” needs valid original and target gauges to preserve physical size.`,
        );
      } else {
        const a = gaugeRates(original.gauge),
          z = gaugeRates(o.newGauge);
        mw = Math.max(1, Math.round((b.w * z.x) / a.x));
        mh = Math.max(1, Math.round((b.h * z.y) / a.y));
        warnings.push(
          `“${m.name}” uses nearest-cell sampling; physical size is approximate and fine details may be lost.`,
        );
      }
    }
    let offsetX = Math.round(m.offsetX),
      offsetY = Math.round(m.offsetY);
    if (m.offsetUnit !== "cells") {
      const g = o.newGauge || original.gauge;
      if (!validGauge(g))
        conflicts.push(
          `“${m.name}” requires measured gauge for physical offsets.`,
        );
      else {
        const r = gaugeRates(g),
          f = m.offsetUnit === "in" ? 2.54 : 1;
        offsetX = Math.round(m.offsetX * f * r.x);
        offsetY = Math.round(m.offsetY * f * r.y);
        warnings.push(
          `“${m.name}” offsets rounded to ${offsetX} stitches and ${offsetY} rows.`,
        );
      }
    }
    const anchor = m.anchor === "seam" ? original.seam : m.anchor;
    const bx =
      (anchor === "left"
        ? b.x
        : anchor === "right"
          ? w - (original.width - b.x - b.w) - mw
          : Math.round((w - mw) / 2 + (b.x - (original.width - b.w) / 2))) +
      offsetX;
    const by =
      (m.rowAnchor === "top"
        ? b.y + shiftY
        : m.rowAnchor === "bottom"
          ? h - (original.height - b.y - b.h) - mh
          : Math.round((h - mh) / 2 + (b.y - (original.height - b.h) / 2))) +
      offsetY;
    if (bx < 0 || by < 0 || bx + mw > w || by + mh > h)
      conflicts.push(
        `Requested fabric cannot contain protected motif “${m.name}”.`,
      );
    for (let yy = 0; yy < mh; yy++)
      for (let xx = 0; xx < mw; xx++) {
        const nx = bx + xx,
          ny = by + yy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const key = `${nx},${ny}`;
        if (occupied.has(key) || !p.removable[ny][nx])
          conflicts.push(`“${m.name}” overlaps other protected artwork.`);
        occupied.add(key);
        const ox = b.x + Math.min(b.w - 1, Math.floor((xx * b.w) / mw)),
          oy = b.y + Math.min(b.h - 1, Math.floor((yy * b.h) / mh));
        p.chart[ny][nx] = original.chart[oy][ox];
        p.removable[ny][nx] = false;
      }
    if (m.policy === "pixels" && o.newGauge && validGauge(original.gauge))
      warnings.push(
        `“${m.name}” retains its stitch layout. A different gauge changes its physical size.`,
      );
    return {
      ...m,
      offsetX: 0,
      offsetY: 0,
      bounds: { x: bx, y: by, w: mw, h: mh },
    };
  });
  p.start =
    Math.abs(shiftY) % 2
      ? original.start === "left"
        ? "right"
        : "left"
      : original.start;
  p.rowRefs = Array.from({ length: h }, (_, y) => {
    const old = y - shiftY;
    return old >= 0 && old < original.height
      ? clone(original.rowRefs[old])
      : { origin: "calculated" as const };
  });
  p.gauge = o.newGauge || original.gauge;
  if (original.foundation && original.foundationAuto) {
    p.foundation = `Chain ${w + (p.stitch === "hdc" ? 2 : 1)}. Work ${w} ${p.stitch === "hdc" ? "half double crochet" : "single crochet"} stitches; turning chain does not count. Review against your original foundation.`;
    warnings.push(
      "Foundation regenerated for this flat panel; review foundation and assembly before crocheting.",
    );
  }
  if (original.foundation && !original.foundationAuto && (dx || dy))
    warnings.push(
      "Authored foundation retained unchanged. Review its counts manually before starting the adapted guide.",
    );
  output.conflicts = [...new Set(conflicts)];
  output.warnings = [...new Set(warnings)];
  output.added = Math.max(0, w * h - original.width * original.height);
  output.removed = Math.max(0, original.width * original.height - w * h);
  if (!output.conflicts.length) output.piece = p;
  return output;
}
export function countsForSize(
  g: Gauge,
  x: number,
  y: number,
  unit: "cm" | "in",
  fit = 0,
  brim = 0,
) {
  const rates = gaugeRates(g);
  const factor = unit === "in" ? 2.54 : 1;
  return {
    width: Math.round((x + brim) * factor * rates.x),
    height: Math.round((y + fit) * factor * rates.y),
  };
}
export function physicalSize(p: Piece, unit: "cm" | "in" = "cm") {
  if (!validGauge(p.gauge)) return undefined;
  const r = gaugeRates(p.gauge),
    f = unit === "in" ? 2.54 : 1;
  return { x: p.width / r.x / f, y: p.height / r.y / f };
}
export function assertConsistency(p: Piece) {
  return (
    p.chart.length === p.height &&
    p.chart.every(
      (r, i) => r.length === p.width && p.removable[i]?.length === p.width,
    ) &&
    p.rowRefs.length === p.height &&
    Array.from({ length: p.height }, (_, i) => direction(p, i)).length ===
      p.height
  );
}
