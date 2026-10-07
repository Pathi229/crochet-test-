import { yarnText } from "./color";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  SquareDashed,
  Undo2,
  Redo2,
  Minus,
  Plus,
  Maximize,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Printer,
  Scaling,
  Play,
  ChevronDown,
  FlipHorizontal2,
  FlipVertical2,
  Copy,
  Move,
  LockKeyhole,
  Check,
  RotateCcw,
  HelpCircle,
  ExternalLink,
  Hand,
} from "lucide-react";
import { Chart } from "./Chart";
import { Field, Notice, Modal } from "./ui";
import { AdaptDialog, GaugeFields, defaultGauge } from "./AdaptDialog";
import { LoopDiagram, LessonDialog, Terms } from "./Lessons";
import { paintCell, flood, transform, type Tool } from "./editor";
import {
  writtenRows,
  startSession,
  guideSteps,
  completeStep,
  undoCompletion,
} from "./guide";
import { physicalSize } from "./resize";
import {
  clone,
  uid,
  revise,
  blankPiece,
  direction,
  type Project,
  type Piece,
  type Bounds,
  type Settings,
  type Gauge,
} from "./model";
import { downloadProject } from "./storage";
const tools = [
  { id: "paint", label: "Paint", Icon: Pencil },
  { id: "erase", label: "Erase", Icon: Eraser },
  { id: "fill", label: "Fill", Icon: PaintBucket },
  { id: "picker", label: "Pick color", Icon: Pipette },
  { id: "select", label: "Select", Icon: SquareDashed },
  { id: "pan", label: "Pan", Icon: Hand },
] as const;
interface Props {
  project: Project;
  settings: Settings;
  saveStatus: string;
  onUpdate: (p: Project) => void;
  onSettings: (s: Settings) => void;
  onBack: () => void;
}
export function Workspace({
  project: p,
  settings,
  onUpdate,
  onSettings,
  onBack,
  saveStatus,
}: Props) {
  const [view, setView] = useState<"design" | "pattern" | "guide">("design"),
    [pieceIndex, setPieceIndex] = useState(0),
    [tool, setTool] = useState<Tool>("paint"),
    [color, setColor] = useState(p.palette[1]?.id || p.palette[0].id),
    [selection, setSelection] = useState<Bounds>(),
    [zoom, setZoom] = useState(0.9),
    [inspector, setInspector] = useState(true),
    [panel, setPanel] = useState<"yarn" | "fabric" | "motifs" | "source">(
      "yarn",
    ),
    [adapt, setAdapt] = useState(false),
    [lesson, setLesson] = useState<string>(),
    [message, setMessage] = useState(""),
    [sessionPrompt, setSessionPrompt] = useState(false),
    [mode, setMode] = useState<"row" | "block">("row"),
    [gaugeAware, setGaugeAware] = useState(false),
    [embed, setEmbed] = useState(false),
    [history, setHistory] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]),
    [motifName, setMotifName] = useState("New motif"),
    [shift, setShift] = useState({ x: 1, y: 0 }),
    [replaceTo, setReplaceTo] = useState(p.palette[0].id);
  const pRef = useRef(p),
    stroke = useRef<Project | undefined>(undefined),
    strokeChanged = useRef(false);
  pRef.current = p;
  const piece = p.pieces[Math.min(pieceIndex, p.pieces.length - 1)];
  const commit = (next: Project, label = "Edit pattern") => {
    setHistory((h) => [...h, pRef.current].slice(-40));
    setFuture([]);
    onUpdate(revise(next, label));
  };
  const updatePiece = (next: Piece, label = "Edit panel") => {
    const n = clone(pRef.current);
    n.pieces[pieceIndex] = next;
    commit(n, label);
  };
  const undo = () => {
    const old = history.at(-1);
    if (old) {
      setHistory((h) => h.slice(0, -1));
      setFuture((f) => [...f, p]);
      onUpdate(
        revise(
          {
            ...old,
            revision: p.revision,
            revisions: p.revisions,
            session: p.session,
          },
          "Undo edit",
        ),
      );
    }
  };
  const redo = () => {
    const next = future.at(-1);
    if (next) {
      setFuture((f) => f.slice(0, -1));
      setHistory((h) => [...h, p]);
      onUpdate(
        revise(
          {
            ...next,
            revision: p.revision,
            revisions: p.revisions,
            session: p.session,
          },
          "Redo edit",
        ),
      );
    }
  };
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });
  const cell = (x: number, y: number, phase: "start" | "drag" | "end") => {
    if (tool === "picker") {
      if (phase === "start") setColor(piece.chart[y][x]);
      return;
    }
    if (tool === "select") return;
    if (phase === "start") {
      stroke.current = clone(pRef.current);
      strokeChanged.current = false;
    }
    if (phase !== "end" && (tool !== "fill" || phase === "start")) {
      const current = pRef.current.pieces[pieceIndex];
      const next =
        tool === "fill"
          ? flood(current, x, y, color)
          : paintCell(
              current,
              x,
              y,
              tool === "erase" ? current.background : color,
            );
      const n = clone(pRef.current);
      n.pieces[pieceIndex] = next;
      n.updated = new Date().toISOString();
      pRef.current = n;
      onUpdate(n);
      strokeChanged.current = true;
    }
    if (phase === "end" && stroke.current && strokeChanged.current) {
      setHistory((h) => [...h, stroke.current!].slice(-40));
      setFuture([]);
      const n = revise(pRef.current, "Chart stroke");
      onUpdate(n);
      stroke.current = undefined;
    }
  };
  const selectionAction = (action: "mirrorX" | "mirrorY" | "move" | "copy") => {
    if (!selection) return;
    try {
      updatePiece(
        transform(
          piece,
          selection,
          action,
          action === "move" || action === "copy" ? shift.x : 0,
          action === "move" || action === "copy" ? shift.y : 0,
        ),
        action,
      );
      if (action === "move")
        setSelection({
          ...selection,
          x: selection.x + shift.x,
          y: selection.y + shift.y,
        });
      setMessage("Artwork updated. Undo is available.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const startGuide = () => {
    if (
      p.issues.some((i) => !i.resolved) ||
      p.pieces.some((pc) => pc.construction !== "flat")
    ) {
      setMessage("Review unresolved source details before starting a guide.");
      setView("pattern");
      return;
    }
    setSessionPrompt(true);
  };
  const rows = writtenRows(piece, p.palette),
    size = physicalSize(piece);
  const session = p.session,
    steps = session ? guideSteps(session) : [],
    step = session ? steps[session.cursor] : undefined,
    finished = !!session && session.completed >= steps.length;
  const sessionUpdate = (next: NonNullable<Project["session"]>) =>
    onUpdate({ ...p, session: next, updated: new Date().toISOString() });
  const guidePiece = session && step ? session.pieces[step.piece] : piece;
  const saveLabel =
    saveStatus === "Saved" ? "Saved on this device" : saveStatus;
  return (
    <div className="workspace">
      <header className="workspace-header">
        <button
          className="icon-button"
          aria-label="Back to projects"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="project-title">
          <input
            aria-label="Project name"
            maxLength={200}
            value={p.name}
            onChange={(e) =>
              onUpdate({
                ...p,
                name: e.target.value,
                updated: new Date().toISOString(),
              })
            }
          />
          <span
            className={
              saveStatus === "Save failed" ? "save-error" : "save-status"
            }
          >
            <span className="status-dot" />
            {saveLabel} · r{p.revision}
          </span>
        </div>
        <div className="workspace-actions">
          <button
            className="icon-button"
            title="Undo (Ctrl/Cmd Z)"
            aria-label="Undo"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            title="Redo"
            aria-label="Redo"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={18} />
          </button>
          <span className="separator" />
          <button
            className="export-button"
            aria-label="Export"
            onClick={() => downloadProject(p)}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setView("pattern");
              setTimeout(() => window.print(), 100);
            }}
            aria-label="Print chart and pattern"
          >
            <Printer size={16} />
          </button>
          <button
            className="primary"
            onClick={() => {
              if (p.session) setView("guide");
              else startGuide();
            }}
          >
            <Play size={15} />
            {p.session ? "Resume crochet" : "Start crocheting"}
          </button>
        </div>
      </header>
      <div className="workspace-subbar">
        <div className="workspace-tabs">
          {(["design", "pattern", "guide"] as const).map((v) => (
            <button
              className={view === v ? "active" : ""}
              key={v}
              onClick={() => setView(v)}
            >
              {
                {
                  design: "Design",
                  pattern: "Pattern & source",
                  guide: "Crochet guide",
                }[v]
              }
            </button>
          ))}
        </div>
        <span className="subbar-meta">
          {p.adapted ? "Adapted revision" : "Original design"} · {p.terminology}{" "}
          terms · {p.example ? "Example project" : "Private project"}
        </span>
      </div>
      {message && (
        <div className="feedback" role="status">
          {message}
          <button className="text-button" onClick={() => setMessage("")}>
            Dismiss
          </button>
        </div>
      )}
      {view === "design" && (
        <div
          className={`editor-layout ${!inspector ? "inspector-hidden" : ""}`}
        >
          <div className="tool-rail">
            {tools.map(({ id, label, Icon }) => (
              <button
                aria-pressed={tool === id}
                className={tool === id ? "selected" : ""}
                key={id}
                onClick={() => setTool(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
            <div className="rail-line" />
            <button onClick={() => setAdapt(true)}>
              <Scaling size={20} />
              <span>Adapt</span>
            </button>
            <button
              onClick={() =>
                onSettings({ ...settings, symbols: !settings.symbols })
              }
              aria-pressed={settings.symbols}
            >
              <span className="symbol-icon">A</span>
              <span>Symbols</span>
            </button>
          </div>
          <main className="canvas-area">
            <div className="canvas-head">
              <div>
                <span className="eyebrow">YOUR DESIGN CANVAS</span>
                <h2>{piece.name}</h2>
              </div>
              <div className="canvas-head-actions">
                <select
                  aria-label="Current panel"
                  value={pieceIndex}
                  onChange={(e) => {
                    setPieceIndex(+e.target.value);
                    setSelection(undefined);
                  }}
                >
                  {p.pieces.map((pc, i) => (
                    <option key={pc.id} value={i}>
                      {pc.name}
                    </option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  aria-label={inspector ? "Hide inspector" : "Show inspector"}
                  onClick={() => setInspector(!inspector)}
                >
                  {inspector ? (
                    <PanelRightClose size={19} />
                  ) : (
                    <PanelRightOpen size={19} />
                  )}
                </button>
              </div>
            </div>
            <div className="chart-scroll">
              <Chart
                piece={piece}
                palette={p.palette}
                symbols={settings.symbols}
                zoom={zoom}
                selection={selection}
                onCell={tool === "pan" ? undefined : cell}
                selecting={tool === "select"}
                onSelection={setSelection}
                gaugeAware={gaugeAware}
                motifs={panel === "motifs"}
              />
            </div>
            <div className="canvas-caption">
              <span>
                {piece.width} stitches × {piece.height} rows
                {size
                  ? ` · ${size.x.toFixed(1)} × ${size.y.toFixed(1)} cm`
                  : " · Add a swatch for measurements"}
              </span>
              <span>
                {piece.template === "beanie"
                  ? "Crown ← stitch axis → brim"
                  : "Stitch axis →"}{" "}
                ·{" "}
                {tool === "paint"
                  ? "Paint to make your mark"
                  : tool === "select"
                    ? "Drag to select artwork"
                    : `${tools.find((t) => t.id === tool)?.label} tool`}
              </span>
            </div>
            {selection && tool === "select" && (
              <div className="selection-bar">
                <strong>
                  {selection.w} × {selection.h} selection
                </strong>
                <button
                  title="Mirror horizontally"
                  aria-label="Mirror horizontally"
                  onClick={() => selectionAction("mirrorX")}
                >
                  <FlipHorizontal2 size={16} />
                </button>
                <button
                  title="Mirror vertically"
                  aria-label="Mirror vertically"
                  onClick={() => selectionAction("mirrorY")}
                >
                  <FlipVertical2 size={16} />
                </button>
                <label>
                  Δ stitches
                  <input
                    aria-label="Selection stitch offset"
                    type="number"
                    value={shift.x}
                    onChange={(e) =>
                      setShift({ ...shift, x: Math.round(+e.target.value) })
                    }
                  />
                </label>
                <label>
                  Δ rows
                  <input
                    aria-label="Selection row offset"
                    type="number"
                    value={shift.y}
                    onChange={(e) =>
                      setShift({ ...shift, y: Math.round(+e.target.value) })
                    }
                  />
                </label>
                <button onClick={() => selectionAction("move")}>
                  <Move size={14} />
                  Move
                </button>
                <button onClick={() => selectionAction("copy")}>
                  <Copy size={14} />
                  Copy
                </button>
              </div>
            )}
            <div className="canvas-toolbar">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}
              >
                <Minus size={17} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              >
                <Plus size={17} />
              </button>
              <span className="separator" />
              <button
                onClick={() => {
                  const area = document.querySelector(".chart-scroll");
                  if (area)
                    setZoom(
                      Math.max(
                        0.2,
                        Math.min(
                          1,
                          (area.clientWidth - 56) / (piece.width * 16 + 60),
                          (area.clientHeight - 56) / (piece.height * 16 + 60),
                        ),
                      ),
                    );
                }}
              >
                <Maximize size={15} />
                Fit
              </button>
              <button
                aria-pressed={gaugeAware}
                onClick={() => {
                  if (!piece.gauge) {
                    setMessage("Add measured gauge in Fabric settings first.");
                    return;
                  }
                  setGaugeAware(!gaugeAware);
                }}
              >
                {gaugeAware ? "Gauge preview" : "Grid preview"}
                <ChevronDown size={14} />
              </button>
            </div>
            <details className="written-preview">
              <summary>
                Written row preview <span>{piece.height} rows</span>
              </summary>
              <div>
                {rows.slice(0, 12).map((r) => (
                  <p key={r.row}>
                    <b>Row {r.row}</b>
                    <span>
                      {r.direction === "left" ? "→" : "←"} {r.text}
                    </span>
                  </p>
                ))}
                {piece.height > 12 && (
                  <button
                    className="text-button"
                    onClick={() => setView("pattern")}
                  >
                    View all written rows
                  </button>
                )}
              </div>
            </details>
          </main>
          {inspector && (
            <aside className="inspector">
              <div className="inspector-tabs">
                {(["yarn", "fabric", "motifs", "source"] as const).map(
                  (tab) => (
                    <button
                      className={panel === tab ? "active" : ""}
                      key={tab}
                      onClick={() => setPanel(tab)}
                    >
                      {
                        {
                          yarn: "Palette",
                          fabric: "Fabric",
                          motifs: "Motifs",
                          source: "Source",
                        }[tab]
                      }
                    </button>
                  ),
                )}
              </div>
              {panel === "yarn" && (
                <>
                  <div className="inspector-heading">
                    <h3>Your yarn palette</h3>
                    <span>{p.palette.length} colors</span>
                  </div>
                  <p className="muted">
                    A few good colors. Endless possibilities.
                  </p>
                  <div className="palette-list">
                    {p.palette.map((y) => (
                      <button
                        key={y.id}
                        className={`yarn ${color === y.id ? "active" : ""}`}
                        aria-pressed={color === y.id}
                        onClick={() => setColor(y.id)}
                      >
                        <span
                          className="yarn-swatch"
                          style={{
                            background: y.hex,
                            color: yarnText(y.hex),
                          }}
                        >
                          {y.symbol}
                        </span>
                        <span>
                          <strong>{y.name}</strong>
                          <small>{y.hex.toUpperCase()}</small>
                        </span>
                        {color === y.id && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                  <div className="yarn-edit">
                    <Field label="Selected yarn name">
                      <input
                        value={
                          p.palette.find((y) => y.id === color)?.name || ""
                        }
                        onChange={(e) => {
                          const n = clone(p);
                          const y = n.palette.find((y) => y.id === color);
                          if (y) y.name = e.target.value;
                          commit(n, "Rename yarn");
                        }}
                      />
                    </Field>
                    <Field label="Yarn color">
                      <input
                        type="color"
                        value={
                          p.palette.find((y) => y.id === color)?.hex ||
                          "#ffffff"
                        }
                        onChange={(e) => {
                          const n = clone(p);
                          const y = n.palette.find((y) => y.id === color);
                          if (y) y.hex = e.target.value;
                          commit(n, "Change yarn color");
                        }}
                      />
                    </Field>
                  </div>
                  <button
                    className="full-button"
                    disabled={p.palette.length >= 32}
                    onClick={() => {
                      const n = clone(p),
                        id = uid();
                      n.palette.push({
                        id,
                        name: `Yarn ${n.palette.length + 1}`,
                        hex: "#baaaa0",
                        symbol: String(n.palette.length + 1),
                      });
                      commit(n, "Add yarn");
                      setColor(id);
                    }}
                  >
                    <Plus size={16} />
                    Add a color
                  </button>
                  <hr />
                  <Field label="Canvas background">
                    <select
                      value={piece.background}
                      onChange={(e) =>
                        updatePiece(
                          { ...piece, background: e.target.value },
                          "Choose background",
                        )
                      }
                    >
                      {p.palette.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <small className="muted">
                    Changing the background choice does not repaint existing
                    cells or approve removal.
                  </small>
                  <Field label="Replace selected color with">
                    <select
                      value={replaceTo}
                      onChange={(e) => setReplaceTo(e.target.value)}
                    >
                      {p.palette.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    className="full-button"
                    onClick={() => {
                      const n = clone(piece);
                      n.chart = n.chart.map((r, y) => {
                        if (r.includes(color))
                          n.rowRefs[y] = { ...n.rowRefs[y], origin: "user" };
                        return r.map((c) => (c === color ? replaceTo : c));
                      });
                      updatePiece(n, "Replace color");
                    }}
                  >
                    Replace across this panel
                  </button>
                  <div className="studio-note">
                    <Pencil size={19} />
                    <p>
                      Every square is a stitch.
                      <br />
                      Take your time. Make it yours.
                    </p>
                  </div>
                </>
              )}
              {panel === "fabric" && (
                <>
                  <h3>Fabric & construction</h3>
                  <Field label="Panel name">
                    <input
                      value={piece.name}
                      onChange={(e) =>
                        updatePiece(
                          { ...piece, name: e.target.value },
                          "Rename panel",
                        )
                      }
                    />
                  </Field>
                  <div className="dimension-readout">
                    <strong>
                      {piece.width}
                      <small>stitches</small>
                    </strong>
                    <span>×</span>
                    <strong>
                      {piece.height}
                      <small>rows</small>
                    </strong>
                  </div>
                  <button
                    className="primary full-button"
                    onClick={() => setAdapt(true)}
                  >
                    <Scaling size={16} />
                    Adapt dimensions
                  </button>
                  <p className="muted">{piece.orientation}</p>
                  <Field label="First row starts at">
                    <select
                      value={piece.start}
                      onChange={(e) =>
                        updatePiece(
                          { ...piece, start: e.target.value as Piece["start"] },
                          "Confirm direction",
                        )
                      }
                    >
                      <option value="left">Left / crown</option>
                      <option value="right">Right / brim</option>
                    </select>
                  </Field>
                  <Field label="Stitch">
                    <select
                      value={piece.stitch}
                      onChange={(e) => {
                        const next = {
                          ...piece,
                          stitch: e.target.value as Piece["stitch"],
                        };
                        if (next.foundationAuto) {
                          const hdc = next.stitch === "hdc";
                          next.foundation = `Chain ${next.width + (hdc ? 2 : 1)}. Work ${next.width} ${hdc ? "half double crochet" : "single crochet"} stitches into the foundation; turning chain does not count.`;
                          next.turning = `Chain ${hdc ? 2 : 1} and turn; turning chain does not count as a stitch.`;
                        }
                        updatePiece(next, "Change stitch");
                        setMessage(
                          "Stitch changed. Review foundation, turning, and measured gauge.",
                        );
                      }}
                    >
                      <option value="sc">
                        {p.terminology === "US"
                          ? "Single crochet"
                          : "Double crochet"}{" "}
                        ({p.terminology})
                      </option>
                      <option value="hdc">
                        {p.terminology === "US"
                          ? "Half double crochet"
                          : "Half treble crochet"}{" "}
                        ({p.terminology})
                      </option>
                    </select>
                  </Field>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={piece.blo}
                      onChange={(e) =>
                        updatePiece(
                          { ...piece, blo: e.target.checked },
                          "Back loop setting",
                        )
                      }
                    />
                    Back loop only
                  </label>
                  <details>
                    <summary>Measured gauge & materials</summary>
                    {!piece.gauge && (
                      <Notice>
                        No measured swatch yet. Enter your own values; the
                        suggested 20 / 16 values are examples.
                      </Notice>
                    )}
                    <GaugeFields
                      g={piece.gauge || defaultGauge}
                      onChange={(g: Gauge) =>
                        updatePiece({ ...piece, gauge: g }, "Measured gauge")
                      }
                    />
                  </details>
                  <details>
                    <summary>Construction constraints</summary>
                    <h4>Approved background edges</h4>
                    {(["left", "right", "top", "bottom"] as const).map(
                      (edge) => (
                        <label key={edge} className="check">
                          <input
                            type="checkbox"
                            checked={piece.approvedEdges[edge]}
                            onChange={(e) =>
                              updatePiece(
                                {
                                  ...piece,
                                  approvedEdges: {
                                    ...piece.approvedEdges,
                                    [edge]: e.target.checked,
                                  },
                                },
                                "Approve edge",
                              )
                            }
                          />
                          {edge}
                        </label>
                      ),
                    )}
                    <Field label="Protected border (cells)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={piece.border}
                        onChange={(e) =>
                          updatePiece(
                            {
                              ...piece,
                              border: Math.max(
                                0,
                                Math.min(200, Math.round(+e.target.value)),
                              ),
                            },
                            "Border constraint",
                          )
                        }
                      />
                    </Field>
                    <div className="field-grid">
                      <Field label="Stitch repeat">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={piece.repeatX}
                          onChange={(e) =>
                            updatePiece(
                              {
                                ...piece,
                                repeatX: Math.max(
                                  1,
                                  Math.min(200, Math.round(+e.target.value)),
                                ),
                              },
                              "Repeat constraint",
                            )
                          }
                        />
                      </Field>
                      <Field label="Row repeat">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={piece.repeatY}
                          onChange={(e) =>
                            updatePiece(
                              {
                                ...piece,
                                repeatY: Math.max(
                                  1,
                                  Math.min(200, Math.round(+e.target.value)),
                                ),
                              },
                              "Repeat constraint",
                            )
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Seam edge">
                      <select
                        value={piece.seam}
                        onChange={(e) =>
                          updatePiece(
                            { ...piece, seam: e.target.value as Piece["seam"] },
                            "Seam edge",
                          )
                        }
                      >
                        <option value="left">Left / crown</option>
                        <option value="right">Right / brim</option>
                      </select>
                    </Field>
                  </details>
                  <hr />
                  <button
                    className="full-button"
                    disabled={p.pieces.length >= 20}
                    onClick={() => {
                      const n = clone(p),
                        newPiece = blankPiece(
                          p.template,
                          piece.width,
                          piece.height,
                        );
                      newPiece.name = `Panel ${p.pieces.length + 1}`;
                      n.pieces.push(newPiece);
                      commit(n, "Add rectangular panel");
                      setPieceIndex(n.pieces.length - 1);
                    }}
                  >
                    <Plus size={16} />
                    Add rectangular panel
                  </button>
                </>
              )}
              {panel === "motifs" && (
                <>
                  <h3>Keep what matters.</h3>
                  <p className="muted">
                    Named selections protect artwork and control placement when
                    the fabric changes.
                  </p>
                  {selection ? (
                    <>
                      <Field label="Motif name">
                        <input
                          value={motifName}
                          onChange={(e) => setMotifName(e.target.value)}
                        />
                      </Field>
                      <button
                        className="full-button"
                        onClick={() => {
                          if (
                            piece.motifs.some(
                              (m) =>
                                selection.x < m.bounds.x + m.bounds.w &&
                                selection.x + selection.w > m.bounds.x &&
                                selection.y < m.bounds.y + m.bounds.h &&
                                selection.y + selection.h > m.bounds.y,
                            )
                          ) {
                            setMessage(
                              "Motifs cannot overlap. Choose a separate selection.",
                            );
                            return;
                          }
                          const n = clone(piece);
                          n.motifs.push({
                            id: uid(),
                            name: motifName || "Motif",
                            bounds: selection,
                            anchor: "left",
                            rowAnchor: "top",
                            policy: "pixels",
                            offsetX: 0,
                            offsetY: 0,
                            offsetUnit: "cells",
                          });
                          updatePiece(n, "Protect motif");
                        }}
                      >
                        <LockKeyhole size={15} />
                        Name & protect selection
                      </button>
                      <button
                        className="full-button"
                        onClick={() => {
                          const n = clone(piece);
                          let count = 0;
                          for (
                            let y = selection.y;
                            y < selection.y + selection.h;
                            y++
                          )
                            for (
                              let x = selection.x;
                              x < selection.x + selection.w;
                              x++
                            ) {
                              if (
                                n.chart[y][x] === n.background &&
                                !n.motifs.some(
                                  (m) =>
                                    x >= m.bounds.x &&
                                    x < m.bounds.x + m.bounds.w &&
                                    y >= m.bounds.y &&
                                    y < m.bounds.y + m.bounds.h,
                                )
                              ) {
                                n.removable[y][x] = true;
                                count++;
                              }
                            }
                          updatePiece(n, "Approve selected background");
                          setMessage(
                            `${count} background cells approved for removal. Non-background artwork remains protected.`,
                          );
                        }}
                      >
                        Approve background removal
                      </button>
                    </>
                  ) : (
                    <Notice>
                      Choose Select, then drag a rectangle on the chart. Painted
                      and erased cells are protected until explicitly approved.
                    </Notice>
                  )}
                  {piece.motifs.map((m, i) => (
                    <div className="motif-item" key={m.id}>
                      <h4>
                        <LockKeyhole size={14} />
                        {m.name}
                      </h4>
                      <small>
                        {m.bounds.w} × {m.bounds.h} · stitch {m.bounds.x + 1},
                        row {m.bounds.y + 1}
                      </small>
                      <Field label="Stitch-axis anchor">
                        <select
                          value={m.anchor}
                          onChange={(e) => {
                            const n = clone(piece);
                            n.motifs[i].anchor = e.target
                              .value as typeof m.anchor;
                            updatePiece(n, "Set anchor");
                          }}
                        >
                          <option value="left">Left / crown</option>
                          <option value="center">Centre / front</option>
                          <option value="right">Right / brim</option>
                          <option value="seam">Seam edge</option>
                        </select>
                      </Field>
                      <Field label="Row-axis anchor">
                        <select
                          value={m.rowAnchor}
                          onChange={(e) => {
                            const n = clone(piece);
                            n.motifs[i].rowAnchor = e.target
                              .value as typeof m.rowAnchor;
                            updatePiece(n, "Set row anchor");
                          }}
                        >
                          <option value="top">Before panel / start</option>
                          <option value="center">Centre</option>
                          <option value="bottom">End of panel</option>
                        </select>
                      </Field>
                      <Field label="Size policy">
                        <select
                          value={m.policy}
                          onChange={(e) => {
                            const n = clone(piece);
                            n.motifs[i].policy = e.target
                              .value as typeof m.policy;
                            updatePiece(n, "Set motif policy");
                          }}
                        >
                          <option value="pixels">Keep stitch layout</option>
                          <option value="physical">
                            Approximate physical size
                          </option>
                          <option value="scale">Scale with fabric</option>
                        </select>
                      </Field>
                      <Field label="Offset units">
                        <select
                          value={m.offsetUnit}
                          onChange={(e) => {
                            const n = clone(piece);
                            n.motifs[i].offsetUnit = e.target
                              .value as typeof m.offsetUnit;
                            updatePiece(n, "Motif offset units");
                          }}
                        >
                          <option value="cells">Stitches / rows</option>
                          <option value="cm">Centimetres</option>
                          <option value="in">Inches</option>
                        </select>
                      </Field>
                      <div className="field-grid">
                        <Field label="Stitch-axis offset">
                          <input
                            type="number"
                            value={m.offsetX}
                            onChange={(e) => {
                              const n = clone(piece);
                              n.motifs[i].offsetX = +e.target.value;
                              updatePiece(n, "Motif offset");
                            }}
                          />
                        </Field>
                        <Field label="Row-axis offset">
                          <input
                            type="number"
                            value={m.offsetY}
                            onChange={(e) => {
                              const n = clone(piece);
                              n.motifs[i].offsetY = +e.target.value;
                              updatePiece(n, "Motif offset");
                            }}
                          />
                        </Field>
                      </div>
                      <button
                        className="text-button"
                        onClick={() =>
                          updatePiece(
                            {
                              ...piece,
                              motifs: piece.motifs.filter(
                                (mm) => mm.id !== m.id,
                              ),
                            },
                            "Remove named motif",
                          )
                        }
                      >
                        Remove named motif
                      </button>
                    </div>
                  ))}
                </>
              )}
              {panel === "source" && (
                <>
                  <h3>Pattern provenance</h3>
                  {p.source ? (
                    <>
                      <span className="badge">{p.source.kind}</span>
                      <p>{p.source.attribution || "No attribution entered"}</p>
                      {p.source.url && (
                        <a href={p.source.url} target="_blank" rel="noreferrer">
                          Open original tutorial <ExternalLink size={14} />
                        </a>
                      )}
                      {p.source.originalImage && (
                        <img
                          className="original-image"
                          src={p.source.originalImage}
                          alt="Preserved original image"
                        />
                      )}
                      <pre className="source-text">{p.source.text}</pre>
                    </>
                  ) : (
                    <p className="muted">
                      Created in your studio. No external source.
                    </p>
                  )}
                  <button
                    className="full-button"
                    onClick={() => setView("pattern")}
                  >
                    Review instructions & questions
                  </button>
                  <h4>Versions</h4>
                  <p>
                    Current r{p.revision} · {p.adapted ? "Adapted" : "Original"}
                  </p>
                  {p.original && (
                    <p className="muted">
                      Original panels are preserved in your project export.
                    </p>
                  )}
                  <small className="muted">
                    The last 15 editing revisions and any frozen crochet session
                    are retained in project backups.
                  </small>
                </>
              )}
            </aside>
          )}
        </div>
      )}
      {view === "pattern" && (
        <main className="pattern-page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">REVIEW BEFORE YOU CROCHET</span>
              <h1>From squares to stitches.</h1>
              <p>Shared chart data keeps the written counts in sync.</p>
            </div>
            <button className="primary" onClick={startGuide}>
              Start guide <ArrowRight size={16} />
            </button>
          </div>
          <div className="pattern-columns">
            <section>
              <div className="pattern-preview">
                <Chart piece={piece} palette={p.palette} symbols zoom={0.55} />
              </div>
              <div className="print-legend">
                {p.palette.map((y) => (
                  <span key={y.id}>
                    <i style={{ background: y.hex }} />
                    {y.symbol} · {y.name}
                  </span>
                ))}
              </div>
              <div className="assembly-diagram">
                <h3>Pieces & assembly</h3>
                <div className="piece-diagrams">
                  {p.pieces.map((pc) => (
                    <div key={pc.id}>
                      <div className="flat-piece">
                        <span>{pc.name}</span>
                        <small>
                          {pc.width} stitches
                          <br />
                          {pc.height} rows
                        </small>
                      </div>
                      <p>
                        {pc.template === "beanie"
                          ? "Crown ← → Brim · join first/last rows"
                          : pc.orientation}
                      </p>
                    </div>
                  ))}
                </div>
                <Notice>
                  Flat panels only. Templates and assembly are drafts needing
                  physical crochet review. Handles, lining, shaped crowns, and
                  garment fit are not generated.
                </Notice>
              </div>
              <Field label="Assembly instructions">
                <textarea
                  value={p.assembly}
                  onChange={(e) =>
                    commit(
                      { ...p, assembly: e.target.value },
                      "Assembly instructions",
                    )
                  }
                />
              </Field>
              <Field label="Project notes">
                <textarea
                  value={p.notes}
                  onChange={(e) =>
                    onUpdate({
                      ...p,
                      notes: e.target.value,
                      updated: new Date().toISOString(),
                    })
                  }
                />
              </Field>
            </section>
            <section>
              <div className="review-questions">
                <h3>Source review</h3>
                {p.issues.length ? (
                  <>
                    {p.issues.map((issue) => (
                      <label className="review-question" key={issue.id}>
                        <input
                          type="checkbox"
                          checked={issue.resolved}
                          onChange={(e) => {
                            const n = clone(p);
                            n.issues = n.issues.map((i) =>
                              i.id === issue.id
                                ? { ...i, resolved: e.target.checked }
                                : i,
                            );
                            commit(n, "Source review");
                          }}
                        />
                        <span>
                          {issue.message}
                          <small>
                            {issue.resolved
                              ? "User-confirmed / corrected"
                              : "Needs confirmation — correct chart or source settings before confirming"}
                          </small>
                        </span>
                      </label>
                    ))}
                    <p className="muted">
                      Confirmation records your review. It does not validate
                      unsupported construction.
                    </p>
                  </>
                ) : (
                  <p className="muted">
                    No unresolved parsing questions. Review foundation and
                    assembly before starting.
                  </p>
                )}
                {piece.construction === "unsupported" && (
                  <Notice error>
                    This source uses unsupported construction. Automatic
                    adaptation and guide creation are disabled; manual chart
                    editing and source storage are available.
                  </Notice>
                )}
              </div>
              <Field label="Terminology convention">
                <select
                  value={p.terminology}
                  onChange={(e) =>
                    commit(
                      {
                        ...p,
                        terminology: e.target.value as Project["terminology"],
                      },
                      "Terminology",
                    )
                  }
                >
                  <option>US</option>
                  <option>UK</option>
                </select>
              </Field>
              {[
                ["Foundation", piece.foundation, "foundation"],
                ["Turning", piece.turning, "turning"],
                ["Finishing", piece.finishing, "finishing"],
              ].map(([label, value, key]) => (
                <Field
                  key={key}
                  label={label}
                  hint={
                    !value
                      ? "Not specified — guide will not invent this step."
                      : undefined
                  }
                >
                  <textarea
                    value={value}
                    onChange={(e) =>
                      updatePiece(
                        {
                          ...piece,
                          [key]: e.target.value,
                          ...(key === "foundation"
                            ? { foundationAuto: false }
                            : {}),
                        },
                        `${label} instructions`,
                      )
                    }
                  />
                </Field>
              ))}
              <details open>
                <summary>Written rows · {piece.name}</summary>
                <div className="written-rows">
                  {rows.map((r) => (
                    <div className="written-row" key={r.row}>
                      <b>
                        Row {r.row}
                        <small>
                          {r.direction === "left"
                            ? "Left → right"
                            : "Right → left"}
                        </small>
                      </b>
                      <span>
                        {piece.stitch.toUpperCase()}
                        {piece.blo ? " BLO" : ""} · {r.text}
                        <small>
                          {r.total} stitches · {r.ref.origin}
                          {r.ref.sourceRow
                            ? ` · source row ${r.ref.sourceRow}`
                            : ""}
                          {r.ref.timestamp !== undefined
                            ? ` · ${r.ref.timestamp}s`
                            : ""}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </details>
              {p.source && (
                <details>
                  <summary>Original source & attribution</summary>
                  <p>{p.source.attribution}</p>
                  <pre className="source-text">{p.source.text}</pre>
                </details>
              )}
            </section>
          </div>
        </main>
      )}
      {view === "guide" && (
        <main className="guide-page">
          {!session ? (
            <div className="guide-empty">
              <Play size={36} />
              <h1>One stitch at a time.</h1>
              <p>
                Start a guide from an approved revision. Your place, notes, and
                stitch counter stay on this device.
              </p>
              <button className="primary" onClick={startGuide}>
                Start crochet session <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <>
              <div className="guide-top">
                <div>
                  <span className="eyebrow">
                    {session.adapted ? "ADAPTED" : "ORIGINAL"} · FROZEN REVISION{" "}
                    {session.revision}
                  </span>
                  <h1>{finished ? "Made by you." : "Find your rhythm."}</h1>
                  <p>
                    {guidePiece.name} ·{" "}
                    {session.mode === "row" ? "Row" : "Color-block"} mode ·{" "}
                    {session.terminology} terminology
                  </p>
                </div>
                <label className="beginner-toggle">
                  <input
                    type="checkbox"
                    checked={settings.beginner}
                    onChange={(e) =>
                      onSettings({ ...settings, beginner: e.target.checked })
                    }
                  />
                  <span>Beginner Mode</span>
                  <HelpCircle size={16} />
                </label>
              </div>
              {session.revision !== p.revision && (
                <Notice>
                  This guide uses frozen revision {session.revision}. The design
                  is now revision {p.revision}; edits have not changed your
                  completed work.
                </Notice>
              )}
              <div className="progress-meta">
                <span>
                  {Math.min(session.completed, steps.length)} / {steps.length}{" "}
                  pattern steps complete
                </span>
                <span>
                  {Math.round((session.completed / steps.length) * 100)}%
                </span>
              </div>
              <progress max={steps.length} value={session.completed} />
              <div className="guide-columns">
                <section className="current-instruction">
                  <div className="instruction-top">
                    <span className="badge">
                      {finished
                        ? "Session complete"
                        : step?.kind === "row" || step?.kind === "block"
                          ? `ROW ${(step.row || 0) + 1} OF ${guidePiece.height}`
                          : step?.kind.toUpperCase()}
                    </span>
                    <span>
                      Step {session.cursor + 1} / {steps.length}
                    </span>
                  </div>
                  <h2>
                    {finished
                      ? "Your last stitch is in."
                      : settings.beginner
                        ? step?.text
                        : step?.short}
                  </h2>
                  {!settings.beginner && !finished && <p>{step?.text}</p>}
                  {settings.beginner && !finished && (
                    <>
                      <div className="context-direction">
                        <span>
                          {guidePiece.template === "beanie"
                            ? "Crown"
                            : "Left edge"}
                        </span>
                        <strong>
                          {step?.row !== undefined &&
                          direction(guidePiece, step.row) === "right"
                            ? "←"
                            : "→"}
                        </strong>
                        <span>
                          {guidePiece.template === "beanie"
                            ? "Brim"
                            : "Right edge"}
                        </span>
                      </div>
                      <p className="muted">
                        {step?.from !== undefined
                          ? `Start at stitch ${step.from + 1}. ${step.count} repetitions. Hook goes ${guidePiece.blo ? "under the back loop only" : "under both top loops"}.`
                          : "Follow the authored construction instruction above. Ask for review if a detail is missing."}
                      </p>
                      {step?.row !== undefined && (
                        <>
                          <LoopDiagram
                            hand={settings.hand}
                            blo={guidePiece.blo}
                          />
                          <button
                            className="full-button"
                            onClick={() =>
                              setLesson(
                                guidePiece.blo ? "blo" : guidePiece.stitch,
                              )
                            }
                          >
                            Show me{" "}
                            {guidePiece.blo
                              ? "BLO with " + guidePiece.stitch
                              : guidePiece.stitch}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {step?.count && !finished && (
                    <div className="stitch-counter">
                      <div>
                        <strong>
                          {session.counter}
                          <small> / {step.count}</small>
                        </strong>
                        <span>Optional stitch counter</span>
                      </div>
                      <button
                        aria-label="Decrease stitch counter"
                        disabled={session.counter === 0}
                        onClick={() =>
                          sessionUpdate({
                            ...session,
                            counter: Math.max(0, session.counter - 1),
                          })
                        }
                      >
                        <Minus size={18} />
                      </button>
                      <button
                        aria-label="Increase stitch counter"
                        disabled={session.counter >= step.count}
                        onClick={() =>
                          sessionUpdate({
                            ...session,
                            counter: Math.min(step.count!, session.counter + 1),
                          })
                        }
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )}
                  <div className="guide-controls">
                    <button
                      disabled={session.cursor === 0}
                      onClick={() =>
                        sessionUpdate({
                          ...session,
                          cursor: session.cursor - 1,
                          counter: 0,
                        })
                      }
                    >
                      <ArrowLeft size={16} />
                      Previous
                    </button>
                    <button
                      className="primary"
                      disabled={finished}
                      onClick={() => sessionUpdate(completeStep(session))}
                    >
                      <Check size={17} />
                      Complete & next
                    </button>
                  </div>
                  <div className="guide-secondary">
                    <button
                      className="text-button"
                      disabled={session.completed === 0}
                      onClick={() => sessionUpdate(undoCompletion(session))}
                    >
                      <Undo2 size={14} />
                      Undo completion
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setSessionPrompt(true)}
                    >
                      <RotateCcw size={14} />
                      New session
                    </button>
                  </div>
                  {steps[session.cursor + 1] && !finished && (
                    <div className="next-instruction">
                      <span className="eyebrow">UP NEXT</span>
                      <p>{steps[session.cursor + 1].short}</p>
                    </div>
                  )}
                  <Field label="Session notes">
                    <textarea
                      value={session.notes}
                      onChange={(e) =>
                        sessionUpdate({ ...session, notes: e.target.value })
                      }
                      placeholder="A hook change, a reminder, a little thought…"
                    />
                  </Field>
                </section>
                <section className="guide-chart">
                  <div className="guide-chart-scroll">
                    <Chart
                      piece={guidePiece}
                      palette={session.palette}
                      zoom={0.72}
                      symbols={settings.symbols}
                      highlight={
                        step?.row !== undefined
                          ? {
                              row: step.row,
                              from: step.from ?? 0,
                              to: step.to ?? guidePiece.width - 1,
                            }
                          : undefined
                      }
                    />
                  </div>
                  <p className="muted">
                    Highlighted outline = current working region. Arrows show
                    actual row direction.
                  </p>
                  <Terms
                    onTerm={setLesson}
                    stitch={guidePiece.stitch}
                    uk={session.terminology === "UK"}
                  />
                  {p.source?.videoId && (
                    <div className="video-help">
                      <h3>Tutorial reference</h3>
                      {step?.timestamp !== undefined ? (
                        <p>
                          Source time: {Math.floor(step.timestamp / 60)}:
                          {String(Math.floor(step.timestamp % 60)).padStart(
                            2,
                            "0",
                          )}
                        </p>
                      ) : (
                        <p>No timestamp attached to this instruction.</p>
                      )}
                      {embed ? (
                        <iframe
                          title="Original YouTube tutorial"
                          key={step?.timestamp}
                          src={`https://www.youtube-nocookie.com/embed/${p.source.videoId}?start=${Math.floor(step?.timestamp || 0)}`}
                          allowFullScreen
                        />
                      ) : (
                        <button onClick={() => setEmbed(true)}>
                          Load embedded tutorial
                        </button>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${p.source.videoId}${step?.timestamp !== undefined ? "&t=" + Math.floor(step.timestamp) + "s" : ""}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source / replay section <ExternalLink size={14} />
                      </a>
                      <small className="muted">
                        If embedding is unavailable, use the source link.
                        Untimed text has no guessed timestamp.
                      </small>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      )}
      {adapt && (
        <AdaptDialog
          project={p}
          piece={piece}
          index={pieceIndex}
          onClose={() => setAdapt(false)}
          onApply={(next, warnings) => {
            const n = clone(p);
            n.original = n.original || clone(p.pieces);
            n.adapted = true;
            n.pieces[pieceIndex] = next;
            commit(n, "Adapt dimensions");
            setAdapt(false);
            setMessage(
              `Adaptation applied. ${warnings[0] || "Protected artwork preserved."}`,
            );
          }}
        />
      )}
      {lesson && (
        <LessonDialog
          term={lesson}
          hand={settings.hand}
          onClose={() => setLesson(undefined)}
        />
      )}
      {sessionPrompt && (
        <Modal
          title={
            session
              ? "Start a new frozen session?"
              : "Ready for the first stitch?"
          }
          subtitle={`Guide will use revision ${p.revision}. Later edits leave this session intact.`}
          onClose={() => setSessionPrompt(false)}
        >
          <Notice>
            Review your materials, foundation, turning-chain convention, and
            assembly. Templates and teaching diagrams need physical crochet
            review.
          </Notice>
          {session && (
            <Notice error>
              A new session replaces the current session progress. Export your
              project first if you want to keep it.
            </Notice>
          )}
          <Field label="Guide granularity">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "row" | "block")}
            >
              <option value="row">One row at a time</option>
              <option value="block">One color block at a time</option>
            </select>
          </Field>
          <div className="modal-footer">
            <button onClick={() => setSessionPrompt(false)}>
              Back to review
            </button>
            <button
              className="primary"
              onClick={() => {
                onUpdate({
                  ...p,
                  session: startSession(p, mode),
                  updated: new Date().toISOString(),
                });
                setView("guide");
                setSessionPrompt(false);
              }}
            >
              Start session <Play size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
