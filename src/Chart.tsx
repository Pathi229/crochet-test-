import { yarnText } from "./color";
import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { direction, type Bounds, type Piece, type Yarn } from "./model";
interface Props {
  piece: Piece;
  palette: Yarn[];
  small?: boolean;
  symbols?: boolean;
  selection?: Bounds;
  highlight?: { row: number; from: number; to: number };
  zoom?: number;
  onCell?: (x: number, y: number, phase: "start" | "drag" | "end") => void;
  onSelection?: (b: Bounds) => void;
  selecting?: boolean;
  gaugeAware?: boolean;
  overlay?: { width: number; height: number; shiftX: number; shiftY: number };
  motifs?: boolean;
  removed?: { width: number; height: number; shiftX: number; shiftY: number };
}
export function Chart({
  piece: p,
  palette,
  small,
  symbols,
  selection,
  highlight,
  zoom = 1,
  onCell,
  onSelection,
  selecting,
  gaugeAware,
  overlay,
  motifs,
  removed,
}: Props) {
  const ref = useRef<SVGSVGElement>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  const [focus, setFocus] = useState({ x: 0, y: 0 });
  const cell = 16,
    margin = small ? 0 : 30;
  const ratio =
    gaugeAware && p.gauge
      ? p.gauge.stitches /
        p.gauge.stitchDistance /
        (p.gauge.rows / p.gauge.rowDistance)
      : 1;
  const cw = cell,
    ch = cell * Math.min(3, Math.max(0.35, ratio));
  const width = p.width * cw + margin * 2,
    height = p.height * ch + margin * 2;
  const map = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(
        p.width - 1,
        Math.max(
          0,
          Math.floor((((e.clientX - r.left) / r.width) * width - margin) / cw),
        ),
      ),
      y: Math.min(
        p.height - 1,
        Math.max(
          0,
          Math.floor((((e.clientY - r.top) / r.height) * height - margin) / ch),
        ),
      ),
    };
  };
  const point = (e: PointerEvent, phase: "start" | "drag" | "end") => {
    if (!onCell || small) return;
    const pos = map(e);
    setFocus(pos);
    if (phase === "start") {
      drag.current = pos;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (selecting) {
      if (drag.current) {
        const start = drag.current;
        onSelection?.({
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          w: Math.abs(pos.x - start.x) + 1,
          h: Math.abs(pos.y - start.y) + 1,
        });
      }
    } else onCell(pos.x, pos.y, phase);
    if (phase === "end") drag.current = null;
  };
  const key = (e: KeyboardEvent) => {
    if (!onCell) return;
    const delta: { [key: string]: [number, number] } = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (delta[e.key]) {
      e.preventDefault();
      const [x, y] = delta[e.key];
      setFocus((f) => ({
        x: Math.min(p.width - 1, Math.max(0, f.x + x)),
        y: Math.min(p.height - 1, Math.max(0, f.y + y)),
      }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selecting) onSelection?.({ x: focus.x, y: focus.y, w: 1, h: 1 });
      else {
        onCell(focus.x, focus.y, "start");
        onCell(focus.x, focus.y, "end");
      }
    }
  };
  return (
    <svg
      ref={ref}
      className={`chart ${small ? "mini-chart" : ""} ${onCell ? "interactive" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      style={small ? undefined : { width: width * zoom, height: height * zoom }}
      role={onCell ? "application" : "img"}
      aria-label={
        small
          ? `${p.name} artwork`
          : `${p.width} stitches by ${p.height} rows. Use arrow keys to inspect cells, Enter to apply the selected tool. Current: row ${focus.y + 1}, stitch ${focus.x + 1}, ${palette.find((c) => c.id === p.chart[focus.y]?.[focus.x])?.name}.`
      }
      tabIndex={onCell ? 0 : undefined}
      onKeyDown={key}
      onPointerDown={(e) => point(e, "start")}
      onPointerMove={(e) => {
        if (drag.current) point(e, "drag");
      }}
      onPointerUp={(e) => point(e, "end")}
      onPointerCancel={(e) => {
        if (drag.current) point(e, "end");
      }}
    >
      <defs>
        <pattern
          id={`added-${p.id}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 8L8 0" stroke="#526346" strokeWidth="1" />
        </pattern>
      </defs>
      <rect
        width={width}
        height={height}
        fill={small ? "transparent" : "var(--paper)"}
      />
      {p.chart.map((row, y) =>
        row.map((color, x) => {
          const yarn = palette.find((c) => c.id === color);
          return (
            <g key={`${x}-${y}`}>
              <rect
                x={margin + x * cw}
                y={margin + y * ch}
                width={cw}
                height={ch}
                fill={yarn?.hex || "#ddd"}
                stroke={small ? "none" : "#252821"}
                strokeOpacity=".12"
                strokeWidth=".5"
              />
              {symbols && !small && (
                <text
                  x={margin + (x + 0.5) * cw}
                  y={margin + (y + 0.5) * ch + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill={yarnText(yarn?.hex || "#ffffff")}
                >
                  {yarn?.symbol}
                </text>
              )}
              {overlay &&
                (x < overlay.shiftX ||
                  x >= overlay.shiftX + overlay.width ||
                  y < overlay.shiftY ||
                  y >= overlay.shiftY + overlay.height) && (
                  <rect
                    x={margin + x * cw}
                    y={margin + y * ch}
                    width={cw}
                    height={ch}
                    fill={`url(#added-${p.id})`}
                    opacity=".65"
                  />
                )}
              {removed &&
                (x + removed.shiftX < 0 ||
                  x + removed.shiftX >= removed.width ||
                  y + removed.shiftY < 0 ||
                  y + removed.shiftY >= removed.height) && (
                  <g>
                    <rect
                      x={margin + x * cw}
                      y={margin + y * ch}
                      width={cw}
                      height={ch}
                      fill="#bb4444"
                      fillOpacity=".3"
                    />
                    <path
                      d={`M${margin + x * cw} ${margin + y * ch}l${cw} ${ch}`}
                      stroke="#bb4444"
                      strokeWidth="1"
                    />
                  </g>
                )}
            </g>
          );
        }),
      )}
      {!small &&
        Array.from(
          { length: p.width },
          (_, x) =>
            (x === 0 || x === p.width - 1 || (x + 1) % 5 === 0) && (
              <text
                key={x}
                x={margin + (x + 0.5) * cw}
                y={margin - 11}
                textAnchor="middle"
                className="chart-number"
              >
                {x + 1}
              </text>
            ),
        )}
      {!small &&
        Array.from({ length: p.height }, (_, y) => (
          <g key={y}>
            {(y === 0 || y === p.height - 1 || (y + 1) % 5 === 0) && (
              <text
                x={margin - 13}
                y={margin + (y + 0.5) * ch + 3}
                textAnchor="middle"
                className="chart-number"
              >
                {y + 1}
              </text>
            )}
            {(highlight?.row === y || y === 0) && (
              <text
                x={
                  direction(p, y) === "left"
                    ? margin - 3
                    : margin + p.width * cw + 3
                }
                y={margin + (y + 0.5) * ch + 3}
                textAnchor={direction(p, y) === "left" ? "end" : "start"}
                className="chart-number"
              >
                {direction(p, y) === "left" ? "→" : "←"}
              </text>
            )}
          </g>
        ))}
      {motifs &&
        !small &&
        p.motifs.map((m) => (
          <g key={m.id}>
            <rect
              x={margin + m.bounds.x * cw}
              y={margin + m.bounds.y * ch}
              width={m.bounds.w * cw}
              height={m.bounds.h * ch}
              fill="none"
              stroke="#526346"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <title>{m.name}: protected</title>
          </g>
        ))}
      {selection && !small && (
        <rect
          x={margin + selection.x * cw}
          y={margin + selection.y * ch}
          width={selection.w * cw}
          height={selection.h * ch}
          fill="#526346"
          fillOpacity=".12"
          stroke="#526346"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
      )}
      {highlight && (
        <rect
          x={margin + Math.min(highlight.from, highlight.to) * cw}
          y={margin + highlight.row * ch}
          width={(Math.abs(highlight.to - highlight.from) + 1) * cw}
          height={ch}
          fill="none"
          stroke="#bb785e"
          strokeWidth="3"
        />
      )}
      {onCell && (
        <rect
          className="cell-focus"
          x={margin + focus.x * cw}
          y={margin + focus.y * ch}
          width={cw}
          height={ch}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
