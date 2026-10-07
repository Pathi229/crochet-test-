import { clone, type Piece, type Bounds } from "./model";
export type Tool = "paint" | "erase" | "fill" | "picker" | "select" | "pan";
export function paintCell(
  p: Piece,
  x: number,
  y: number,
  color: string,
): Piece {
  const n = clone(p);
  n.chart[y][x] = color;
  n.removable[y][x] = false;
  n.rowRefs[y] = { ...n.rowRefs[y], origin: "user" };
  return n;
}
export function flood(p: Piece, x: number, y: number, color: string): Piece {
  const n = clone(p),
    old = n.chart[y][x];
  if (old === color) return n;
  const stack = [[x, y]],
    seen = new Set<string>();
  while (stack.length) {
    const [xx, yy] = stack.pop()!;
    if (
      xx < 0 ||
      yy < 0 ||
      xx >= n.width ||
      yy >= n.height ||
      seen.has(`${xx},${yy}`) ||
      n.chart[yy][xx] !== old
    )
      continue;
    seen.add(`${xx},${yy}`);
    n.chart[yy][xx] = color;
    n.removable[yy][xx] = false;
    n.rowRefs[yy] = { ...n.rowRefs[yy], origin: "user" };
    stack.push([xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]);
  }
  return n;
}
export function transform(
  p: Piece,
  b: Bounds,
  action: "mirrorX" | "mirrorY" | "move" | "copy",
  dx = 0,
  dy = 0,
): Piece {
  if (![dx, dy, b.x, b.y, b.w, b.h].every(Number.isInteger))
    throw new Error("Use whole stitch and row offsets for chart editing.");
  if (
    b.x + dx < 0 ||
    b.y + dy < 0 ||
    b.x + b.w + dx > p.width ||
    b.y + b.h + dy > p.height
  )
    throw new Error("The selected artwork would leave the canvas.");
  const n = clone(p);
  if (action !== "copy") {
    for (const m of n.motifs) {
      const within =
        m.bounds.x >= b.x &&
        m.bounds.y >= b.y &&
        m.bounds.x + m.bounds.w <= b.x + b.w &&
        m.bounds.y + m.bounds.h <= b.y + b.h;
      if (within) {
        if (action === "move") {
          m.bounds.x += dx;
          m.bounds.y += dy;
        }
        if (action === "mirrorX")
          m.bounds.x = b.x + b.w - (m.bounds.x - b.x) - m.bounds.w;
        if (action === "mirrorY")
          m.bounds.y = b.y + b.h - (m.bounds.y - b.y) - m.bounds.h;
      }
    }
  }
  if (action === "move")
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        n.chart[b.y + y][b.x + x] = p.background;
        n.removable[b.y + y][b.x + x] = false;
        n.rowRefs[b.y + y] = { ...n.rowRefs[b.y + y], origin: "user" };
      }
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const sx = action === "mirrorX" ? b.w - 1 - x : x,
        sy = action === "mirrorY" ? b.h - 1 - y : y;
      n.chart[b.y + y + dy][b.x + x + dx] = p.chart[b.y + sy][b.x + sx];
      n.removable[b.y + y + dy][b.x + x + dx] = false;
      n.rowRefs[b.y + y + dy] = { ...n.rowRefs[b.y + y + dy], origin: "user" };
    }
  return n;
}
