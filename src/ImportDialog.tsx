import { useState } from "react";
import {
  Upload,
  ArrowRight,
  FileText,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Modal, Field, Notice } from "./ui";
import {
  parsePattern,
  importExample,
  youtubeId,
  imageToChart,
  type ParseOptions,
} from "./imports";
import { createProject, blankPiece, uid, type Project } from "./model";
import { decodeProject } from "./storage";
import { Chart } from "./Chart";
export function ImportDialog({
  onClose,
  onImport,
  initial = "written",
}: {
  onClose: () => void;
  onImport: (p: Project) => void;
  initial?: "written" | "tutorial" | "image" | "project";
}) {
  const [kind, setKind] = useState(initial),
    [text, setText] = useState(""),
    [url, setUrl] = useState(""),
    [attribution, setAttribution] = useState(""),
    [start, setStart] = useState(""),
    [stitch, setStitch] = useState<"sc" | "hdc">("hdc"),
    [blo, setBlo] = useState(true),
    [turn, setTurn] = useState(false),
    [terminology, setTerminology] = useState<"US" | "UK">("US"),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<Project>(),
    [image, setImage] = useState(""),
    [width, setWidth] = useState(40),
    [height, setHeight] = useState(40),
    [colors, setColors] = useState(5),
    [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 }),
    [busy, setBusy] = useState(false);
  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      if (file.size > 12 * 1024 * 1024)
        throw new Error("Choose a file smaller than 12 MB.");
      if (kind === "image") {
        if (
          !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
            file.type,
          )
        )
          throw new Error("Choose PNG, JPEG, WebP, or GIF.");
        const data = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error("Could not read image."));
          r.readAsDataURL(file);
        });
        setImage(data);
        setDraft(undefined);
      } else if (kind === "project") {
        const p = decodeProject(await file.text());
        p.id = uid();
        p.name = p.name.slice(0, 180) + " (imported)";
        p.example = false;
        onImport(p);
      } else {
        setText(await file.text());
        setDraft(undefined);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const review = async () => {
    setError("");
    setBusy(true);
    try {
      if (kind === "image") {
        if (!image) throw new Error("Choose an image first.");
        if (
          ![width, height, colors, ...Object.values(crop)].every(
            Number.isFinite,
          ) ||
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 1 ||
          height < 1 ||
          width > 200 ||
          height > 200 ||
          colors < 2 ||
          colors > 12 ||
          crop.w <= 0 ||
          crop.h <= 0 ||
          crop.x < 0 ||
          crop.y < 0 ||
          crop.x + crop.w > 100 ||
          crop.y + crop.h > 100
        )
          throw new Error(
            "Check dimensions, colors, and crop. The crop must stay inside 0–100%.",
          );
        const converted = await imageToChart(image, {
          width,
          height,
          colors,
          crop,
        });
        const p = createProject("custom", "Image study");
        p.palette = converted.palette;
        const piece = blankPiece("custom", width, height);
        piece.background = converted.palette[0].id;
        piece.chart = converted.chart;
        piece.removable = converted.chart.map((r) => r.map(() => false));
        p.pieces = [piece];
        p.source = {
          kind: "image",
          text: "Local raster conversion. Artwork only; does not generate shaping or assembly.",
          attribution,
          originalImage: image,
          timed: [],
        };
        setDraft(p);
      } else {
        if (!text.trim())
          throw new Error("Paste your pattern or transcript first.");
        if (kind === "tutorial" && !youtubeId(url))
          throw new Error("Enter a valid YouTube video link.");
        const options: ParseOptions = {
          start: start === "left" || start === "right" ? start : undefined,
          stitch,
          blo,
          turningConfirmed: turn,
          terminology,
          attribution,
          tutorialUrl: kind === "tutorial" ? url : undefined,
        };
        setDraft(parsePattern(text, options).project);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title="Bring a pattern into your studio"
      subtitle="Keep the source. Review the interpretation. Make it yours."
      onClose={onClose}
    >
      <div className="segmented import-tabs">
        {(
          [
            ["written", FileText, "Written pattern"],
            ["tutorial", Video, "Tutorial"],
            ["image", ImageIcon, "Image"],
            ["project", Upload, "Project backup"],
          ] as const
        ).map(([k, Icon, label]) => (
          <button
            key={k}
            className={kind === k ? "active" : ""}
            onClick={() => {
              setKind(k);
              setDraft(undefined);
              setError("");
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="import-columns">
        <div>
          {kind === "project" ? (
            <>
              <p>
                Restore an editable .crochet.json backup, including its frozen
                session. Newer or malformed schemas are rejected.
              </p>
              <input
                aria-label="Project backup file"
                type="file"
                accept=".json"
                onChange={(e) => void chooseFile(e.target.files?.[0])}
              />
            </>
          ) : kind === "image" ? (
            <>
              <div className="upload-zone">
                <ImageIcon size={32} />
                <strong>Turn pixels into stitches</strong>
                <p>PNG, JPEG, WebP, GIF · processed on this device</p>
                <input
                  aria-label="Image file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => void chooseFile(e.target.files?.[0])}
                />
              </div>
              {image && (
                <img
                  className="original-image"
                  src={image}
                  alt="Original uploaded artwork"
                />
              )}
              <div className="field-grid">
                <Field label="Stitches">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={width}
                    onChange={(e) => setWidth(+e.target.value)}
                  />
                </Field>
                <Field label="Rows">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={height}
                    onChange={(e) => setHeight(+e.target.value)}
                  />
                </Field>
                <Field label="Maximum colors">
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={colors}
                    onChange={(e) => setColors(+e.target.value)}
                  />
                </Field>
              </div>
              <h4>Crop · percentage of original</h4>
              <div className="field-grid">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <Field
                    key={k}
                    label={{ x: "Left", y: "Top", w: "Width", h: "Height" }[k]}
                  >
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={crop[k]}
                      onChange={(e) =>
                        setCrop({ ...crop, [k]: +e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Notice>
                Conversion creates artwork, not a garment pattern. Clean up
                cells in the editor; the original image is retained.
              </Notice>
            </>
          ) : (
            <>
              {kind === "tutorial" && (
                <>
                  <Field label="YouTube link">
                    <input
                      placeholder="https://www.youtube.com/watch?v=…"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </Field>
                  <Notice>
                    Paste a transcript or upload SRT/VTT captions. Automatic
                    retrieval and AI interpretation are unavailable. No content
                    is fetched from the link.
                  </Notice>
                  <input
                    aria-label="Caption file"
                    type="file"
                    accept=".srt,.vtt,.txt"
                    onChange={(e) => void chooseFile(e.target.files?.[0])}
                  />
                </>
              )}
              <Field
                label={
                  kind === "tutorial"
                    ? "Transcript or timed captions"
                    : "Structured rows"
                }
              >
                <textarea
                  className="source-input"
                  placeholder={importExample}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setDraft(undefined);
                  }}
                />
              </Field>
              <button
                className="text-button"
                onClick={() => {
                  setText(importExample);
                  setStart("left");
                  setTurn(true);
                }}
              >
                Use labelled example rows
              </button>
              <div className="field-grid">
                <Field label="First starting edge">
                  <select
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  >
                    <option value="">Needs confirmation</option>
                    <option value="left">Left / crown</option>
                    <option value="right">Right / brim</option>
                  </select>
                </Field>
                <Field label="Terminology">
                  <select
                    value={terminology}
                    onChange={(e) =>
                      setTerminology(e.target.value as "US" | "UK")
                    }
                  >
                    <option>US</option>
                    <option>UK</option>
                  </select>
                </Field>
                <Field label="Base stitch">
                  <select
                    value={stitch}
                    onChange={(e) => setStitch(e.target.value as "sc" | "hdc")}
                  >
                    <option value="sc">
                      {terminology === "US"
                        ? "Single crochet"
                        : "Double crochet"}
                    </option>
                    <option value="hdc">
                      {terminology === "US"
                        ? "Half double crochet"
                        : "Half treble crochet"}
                    </option>
                  </select>
                </Field>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={blo}
                  onChange={(e) => setBlo(e.target.checked)}
                />
                Back loop only
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={turn}
                  onChange={(e) => setTurn(e.target.checked)}
                />
                Confirmed: turning chain does not count
              </label>
            </>
          )}
          {kind !== "project" && (
            <Field label="Creator / source attribution">
              <input
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="Keep the original creator’s credit"
              />
            </Field>
          )}
        </div>
        <div className="review-panel">
          <span className="eyebrow">INTERPRETATION PREVIEW</span>
          {draft ? (
            <>
              <h3>
                {draft.pieces[0].width} stitches × {draft.pieces[0].height} rows
              </h3>
              <Chart small piece={draft.pieces[0]} palette={draft.palette} />
              <p>
                {draft.issues.length
                  ? `${draft.issues.length} details need review`
                  : "Supported rows parsed. Review the chart before committing."}
              </p>
              {draft.issues.map((i) => (
                <div className="review-issue" key={i.id}>
                  {i.message}
                </div>
              ))}
              <Notice>
                Imports stay private in this browser. Source content is
                preserved. Unsupported patterns can be stored and edited, but
                cannot resize automatically.
              </Notice>
            </>
          ) : (
            <div className="review-empty">
              <FileText size={40} strokeWidth={1} />
              <p>Your chart and review questions will appear here.</p>
              <small>
                Supported format: explicit row numbers, counts, color names, and
                optional [crown-to-brim] or [brim-to-crown] directions.
                Unrestricted narration needs manual transcription.
              </small>
            </div>
          )}
        </div>
      </div>
      {kind !== "project" && (
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => void review()} disabled={busy}>
            {busy ? "Converting…" : "Review interpretation"}
          </button>
          {draft && (
            <button className="primary" onClick={() => onImport(draft)}>
              Save & review in studio <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
