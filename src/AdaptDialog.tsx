import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Modal, Field, Notice } from "./ui";
import { Chart } from "./Chart";
import { countsForSize, resizePiece, physicalSize } from "./resize";
import {
  clone,
  validGauge,
  type Piece,
  type Project,
  type Gauge,
} from "./model";
export function GaugeFields({
  g,
  onChange,
}: {
  g: Gauge;
  onChange: (g: Gauge) => void;
}) {
  return (
    <>
      <div className="field-grid">
        <Field label="Swatch stitches">
          <input
            type="number"
            min="1"
            value={g.stitches}
            onChange={(e) => onChange({ ...g, stitches: +e.target.value })}
          />
        </Field>
        <Field label="Across distance">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={g.stitchDistance}
            onChange={(e) =>
              onChange({ ...g, stitchDistance: +e.target.value })
            }
          />
        </Field>
        <Field label="Swatch rows">
          <input
            type="number"
            min="1"
            value={g.rows}
            onChange={(e) => onChange({ ...g, rows: +e.target.value })}
          />
        </Field>
        <Field label="Over distance">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={g.rowDistance}
            onChange={(e) => onChange({ ...g, rowDistance: +e.target.value })}
          />
        </Field>
        <Field label="Swatch unit">
          <select
            value={g.unit}
            onChange={(e) =>
              onChange({ ...g, unit: e.target.value as "cm" | "in" })
            }
          >
            <option value="cm">Centimetres</option>
            <option value="in">Inches</option>
          </select>
        </Field>
        <Field label="Swatch state">
          <select
            value={g.state}
            onChange={(e) =>
              onChange({ ...g, state: e.target.value as Gauge["state"] })
            }
          >
            <option value="unwashed">Unwashed</option>
            <option value="blocked">Blocked</option>
            <option value="washed">Washed</option>
          </select>
        </Field>
      </div>
      <Field label="Hook">
        <input
          value={g.hook}
          onChange={(e) => onChange({ ...g, hook: e.target.value })}
        />
      </Field>
      <Field label="Yarn notes">
        <input
          value={g.yarn}
          onChange={(e) => onChange({ ...g, yarn: e.target.value })}
        />
      </Field>
    </>
  );
}
export const defaultGauge: Gauge = {
  stitches: 20,
  rows: 16,
  stitchDistance: 10,
  rowDistance: 10,
  unit: "cm",
  hook: "",
  yarn: "",
  state: "unwashed",
};
export function AdaptDialog({
  project,
  piece,
  index,
  onClose,
  onApply,
}: {
  project: Project;
  piece: Piece;
  index: number;
  onClose: () => void;
  onApply: (p: Piece, warnings: string[]) => void;
}) {
  const [mode, setMode] = useState<"counts" | "physical">("counts"),
    [width, setWidth] = useState(
      piece.template === "beanie" ? 60 : piece.width + 10,
    ),
    [height, setHeight] = useState(piece.height),
    [placement, setPlacement] = useState<"left" | "center" | "right">(
      piece.template === "beanie" ? "left" : "center",
    ),
    [prefix, setPrefix] = useState(0),
    [gauge, setGauge] = useState<Gauge>(clone(piece.gauge || defaultGauge)),
    [useGauge, setUseGauge] = useState(!!piece.gauge),
    [targetX, setTargetX] = useState(30),
    [targetY, setTargetY] = useState(50),
    [unit, setUnit] = useState<"cm" | "in">("cm"),
    [fit, setFit] = useState(piece.fitAllowance),
    [brim, setBrim] = useState(piece.brimAllowance),
    [candidate, setCandidate] = useState(clone(piece));
  const counts =
    mode === "physical" && validGauge(gauge)
      ? countsForSize(gauge, targetX, targetY, unit, fit, brim)
      : { width, height };
  const result = resizePiece(candidate, {
    ...counts,
    xPlacement: placement,
    prefixRows: prefix,
    newGauge: useGauge ? gauge : undefined,
  });
  const invalidPhysical =
    mode === "physical" &&
    (!Number.isFinite(targetX) ||
      !Number.isFinite(targetY) ||
      targetX <= 0 ||
      targetY <= 0 ||
      brim < 0);
  const unresolved = project.issues.some((i) => !i.resolved);
  const size = result.piece && physicalSize(result.piece, unit);
  const dx = (result.piece?.width || counts.width) - piece.width;
  const shiftX =
    placement === "left" ? 0 : placement === "right" ? dx : Math.floor(dx / 2);
  return (
    <Modal
      wide
      title="A little more room. The same idea."
      subtitle={`Adapt ${piece.name} · original revision ${project.revision} stays preserved`}
      onClose={onClose}
    >
      <div className="adapt-columns">
        <div>
          <div className="segmented">
            <button
              className={mode === "counts" ? "active" : ""}
              onClick={() => setMode("counts")}
            >
              Stitch counts
            </button>
            <button
              className={mode === "physical" ? "active" : ""}
              onClick={() => setMode("physical")}
            >
              Measurements
            </button>
          </div>
          {mode === "counts" ? (
            <div className="field-grid">
              <Field label="Target stitches">
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={width}
                  onChange={(e) => setWidth(+e.target.value)}
                />
              </Field>
              <Field label="Target rows">
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={height}
                  onChange={(e) => setHeight(+e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="field-grid">
                <Field
                  label={
                    piece.template === "beanie"
                      ? "Crown-to-brim length"
                      : "Stitch-axis distance"
                  }
                >
                  <input
                    type="number"
                    min=".1"
                    step=".1"
                    value={targetX}
                    onChange={(e) => setTargetX(+e.target.value)}
                  />
                </Field>
                <Field
                  label={
                    piece.template === "beanie"
                      ? "Head circumference"
                      : "Row-axis distance"
                  }
                >
                  <input
                    type="number"
                    min=".1"
                    step=".1"
                    value={targetY}
                    onChange={(e) => setTargetY(+e.target.value)}
                  />
                </Field>
                <Field label="Target units">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as "cm" | "in")}
                  >
                    <option value="cm">Centimetres</option>
                    <option value="in">Inches</option>
                  </select>
                </Field>
              </div>
              {piece.template === "beanie" && (
                <div className="field-grid">
                  <Field
                    label="Fit allowance (+ / −)"
                    hint="Added to circumference, in target units"
                  >
                    <input
                      type="number"
                      step=".1"
                      value={fit}
                      onChange={(e) => setFit(+e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Fold-up brim allowance"
                    hint="Added to crown-to-brim length"
                  >
                    <input
                      type="number"
                      min="0"
                      step=".1"
                      value={brim}
                      onChange={(e) => setBrim(+e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <Notice>
                A measured swatch is required. Yarn weight alone cannot
                determine gauge. Requested: {targetX} × {targetY} {unit}, before
                allowances.
              </Notice>
            </>
          )}
          <h4>Placement & background</h4>
          <Field label="Stitch-axis placement">
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as typeof placement)}
            >
              <option value="left">Keep left / crown edge</option>
              <option value="center">Balanced around centre</option>
              <option value="right">Keep right / brim edge</option>
            </select>
          </Field>
          <Field
            label="Rows before the original panel"
            hint="For reductions, enter a negative count. Remaining change goes after the panel."
          >
            <input
              type="number"
              value={prefix}
              onChange={(e) => setPrefix(+e.target.value)}
            />
          </Field>
          <button
            className="text-button"
            onClick={() => {
              const delta = counts.height - piece.height;
              setPrefix(Math.floor(delta / 2));
            }}
          >
            Balance added rows around motif
          </button>
          <h4>
            <LockKeyhole size={14} /> Motif policies
          </h4>
          {candidate.motifs.length ? (
            candidate.motifs.map((m, i) => (
              <Field key={m.id} label={m.name}>
                <select
                  value={m.policy}
                  onChange={(e) => {
                    const n = clone(candidate);
                    n.motifs[i].policy = e.target.value as typeof m.policy;
                    setCandidate(n);
                  }}
                >
                  <option value="pixels">Keep stitch / pixel layout</option>
                  <option value="physical">
                    Keep approximate physical size
                  </option>
                  <option value="scale">Scale with panel</option>
                </select>
              </Field>
            ))
          ) : (
            <p className="muted">
              Artwork outside named motifs is preserved without scaling. Name a
              selection in the editor for other policies.
            </p>
          )}
          <details open={mode === "physical"}>
            <summary>Measured target gauge</summary>
            <label className="check">
              <input
                type="checkbox"
                checked={useGauge}
                onChange={(e) => setUseGauge(e.target.checked)}
              />
              Use this measured gauge
            </label>
            <GaugeFields
              g={gauge}
              onChange={(g) => {
                setGauge(g);
                setUseGauge(true);
              }}
            />
          </details>
        </div>
        <div className="adapt-preview">
          <div className="preview-label">
            <span className="eyebrow">ADAPTATION PREVIEW</span>
            <span>Piece {index + 1}</span>
          </div>
          {result.piece ? (
            <>
              <Chart
                piece={result.piece}
                palette={project.palette}
                zoom={0.58}
                motifs
                overlay={{
                  width: piece.width,
                  height: piece.height,
                  shiftX,
                  shiftY: prefix,
                }}
              />
              {(result.piece.width < piece.width ||
                result.piece.height < piece.height) && (
                <details>
                  <summary>
                    Removed background · crosshatched on original
                  </summary>
                  <Chart
                    piece={piece}
                    palette={project.palette}
                    zoom={0.4}
                    removed={{
                      width: result.piece.width,
                      height: result.piece.height,
                      shiftX,
                      shiftY: prefix,
                    }}
                  />
                  <p className="muted">
                    Crosses mark removed cells. Protected artwork cannot be
                    removed.
                  </p>
                </details>
              )}
              <div className="adapt-stats">
                <strong>
                  {piece.width} → {result.piece.width}
                  <small>stitches per row</small>
                </strong>
                <strong>
                  {piece.height} → {result.piece.height}
                  <small>rows</small>
                </strong>
              </div>
              {size && (
                <p>
                  Achievable: {size.x.toFixed(2)} × {size.y.toFixed(2)} {unit}.
                  Rounded to whole cells and construction repeats.
                </p>
              )}
              <div className="legend-inline">
                <span>▧ Added background</span>
                <span>▱ Dashed = protected motif</span>
              </div>
            </>
          ) : (
            <div className="conflict-art">
              <LockKeyhole size={42} />
              <h3>Keep the artwork safe.</h3>
              <p>This size or placement conflicts with protected fabric.</p>
            </div>
          )}
          {invalidPhysical && (
            <Notice error>
              Requested measurements must be positive; brim allowance cannot be
              negative.
            </Notice>
          )}
          {result.conflicts.map((c) => (
            <Notice error key={c}>
              {c}
            </Notice>
          ))}
          {result.warnings.map((w) => (
            <Notice key={w}>{w}</Notice>
          ))}
          {unresolved && (
            <Notice error>
              Resolve the source interpretation questions before automatic
              adaptation.
            </Notice>
          )}
          {mode === "physical" && (!useGauge || !validGauge(gauge)) && (
            <Notice error>Enter a valid measured gauge and enable it.</Notice>
          )}
          <p className="muted">
            No automatic shaping or fit guarantee. Review foundation, joins,
            allowances, and the adapted chart before crocheting.
          </p>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose}>Keep original</button>
        <button
          className="primary"
          disabled={
            invalidPhysical ||
            !result.piece ||
            unresolved ||
            (useGauge && !validGauge(gauge)) ||
            (mode === "physical" && !useGauge)
          }
          onClick={() => {
            const p = result.piece!;
            p.fitAllowance = fit;
            p.brimAllowance = brim;
            onApply(p, result.warnings);
          }}
        >
          Apply adaptation <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
