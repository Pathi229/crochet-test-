import { useState } from "react";
import { RotateCcw, ArrowRight } from "lucide-react";
import { Modal, Notice } from "./ui";
const lessons: Record<string, { title: string; steps: string[] }> = {
  chain: {
    title: "Chain · ch",
    steps: [
      "Make a slip knot and place it on your hook. Keep a relaxed loop.",
      "Yarn over: bring working yarn over the hook from back to front.",
      "Draw yarn through the loop on the hook. One chain is made. Repeat without tightening.",
    ],
  },
  sc: {
    title: "Single crochet · sc (US) / dc (UK)",
    steps: [
      "Insert the hook under both top loops of the next stitch, unless your pattern specifies BLO.",
      "Yarn over and draw up a loop. Two loops remain on the hook.",
      "Yarn over and pull through both loops. One single crochet is complete.",
    ],
  },
  hdc: {
    title: "Half double crochet · hdc (US) / htr (UK)",
    steps: [
      "Yarn over before inserting your hook. For BLO, insert under the back loop only.",
      "Yarn over and draw up a loop. Three loops remain on the hook.",
      "Yarn over and draw through all three loops. One half double crochet is complete.",
    ],
  },
  blo: {
    title: "Back loop only · BLO",
    steps: [
      "Look at the V on top of the next stitch. The front loop is the strand nearest you; the back loop is farther away.",
      "For half double crochet: yarn over first. Insert the hook under the farther, back loop only. Leave the front loop untouched.",
      "Yarn over, draw up a loop, then yarn over and draw through all three loops. Repeat in the back loop of the next stitch.",
    ],
  },
  both: {
    title: "Both loops",
    steps: [
      "Locate the two strands of the V on top of the stitch.",
      "Insert the hook under both strands, from front to back.",
      "Continue the stitch specified by your pattern. Both strands are held above the hook.",
    ],
  },
  turn: {
    title: "Turning",
    steps: [
      "Complete the final stitch of the row. Check your count.",
      "Make the number of turning chains in your approved instructions. Whether chains count must be confirmed.",
      "Turn the fabric like a page. Work in the next starting stitch specified by the pattern.",
    ],
  },
  color: {
    title: "Changing color",
    steps: [
      "Work the last stitch in the old color until its final yarn-over.",
      "Use the new yarn for that final yarn-over and draw through the remaining loops.",
      "Continue in the new color. Manage floats or carried yarn with your chosen technique; the chart does not choose a float strategy.",
    ],
  },
  join: {
    title: "Joining & finishing",
    steps: [
      "Align the joining edges named in the project assembly. Check both edges have compatible lengths.",
      "Use your chosen and tested seam. The flat-panel chart does not determine seam tension.",
      "Fasten off and weave in the ends securely. Block as appropriate for your yarn.",
    ],
  },
};
export function LoopDiagram({
  hand = "right",
  blo = true,
}: {
  hand?: "left" | "right";
  blo?: boolean;
}) {
  const hx = hand === "right" ? 240 : 60;
  return (
    <svg
      viewBox="0 0 300 185"
      className="loop-diagram"
      role="img"
      aria-label={`Authored schematic: ${hand}-handed hook enters under ${blo ? "the back loop only" : "both top loops"}. Front loop is nearest you; back loop is farther away.`}
    >
      <path
        d="M55 102Q150 12 245 102"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M55 102Q150 168 245 102"
        fill="none"
        stroke="#bc9a7a"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d={`M${hx} 30L150 85q-20 12-12-8`}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle
        cx="150"
        cy="71"
        r="19"
        fill="none"
        stroke="var(--clay)"
        strokeWidth="2"
        strokeDasharray="3 3"
      />
      <text x="150" y="24" textAnchor="middle" className="diagram-label">
        Back loop · farther away
      </text>
      <text x="150" y="155" textAnchor="middle" className="diagram-label">
        Front loop · nearest you
      </text>
      <text x="150" y="179" textAnchor="middle" className="diagram-label">
        {blo ? "Insert under back loop only" : "Insert under both loops"} ·{" "}
        {hand}-handed
      </text>
    </svg>
  );
}
export function LessonDialog({
  term,
  hand,
  onClose,
}: {
  term: string;
  hand: "left" | "right";
  onClose: () => void;
}) {
  const lesson = lessons[term] || lessons.hdc;
  const [step, setStep] = useState(0);
  return (
    <Modal
      title={lesson.title}
      subtitle="Technique practice · separate from your pattern progress"
      onClose={onClose}
    >
      <Notice>
        Authored teaching draft. Diagrams and templates still need independent
        crochet review; this schematic is not a realistic stitch simulation.
      </Notice>
      <LoopDiagram hand={hand} blo={term === "blo"} />
      <span className="eyebrow">
        DEMONSTRATION ACTION {step + 1} OF {lesson.steps.length}
      </span>
      <p className="lesson-text">{lesson.steps[step]}</p>
      <div className="modal-footer">
        <button onClick={() => setStep(0)}>
          <RotateCcw size={16} />
          Show me again
        </button>
        <button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Previous action
        </button>
        <button
          className="primary"
          onClick={() => setStep((s) => (s + 1) % lesson.steps.length)}
        >
          Next demonstration action <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
export function Terms({
  onTerm,
  stitch,
  uk,
}: {
  onTerm: (t: string) => void;
  stitch: "sc" | "hdc";
  uk: boolean;
}) {
  return (
    <div className="terms">
      <span className="eyebrow">
        TERMS IN THIS PROJECT · {uk ? "UK" : "US"}
      </span>
      {[
        ["chain", "ch · Chain"],
        [
          stitch,
          stitch === "sc"
            ? uk
              ? "dc · Double crochet"
              : "sc · Single crochet"
            : uk
              ? "htr · Half treble crochet"
              : "hdc · Half double crochet",
        ],
        ["blo", "BLO · Back loop only"],
        ["both", "Both loops"],
        ["turn", "Turning"],
        ["color", "Color changes"],
        ["join", "Joining & finishing"],
      ].map(([term, label]) => (
        <button key={term} className="term-button" onClick={() => onTerm(term)}>
          {label}
          <ArrowRight size={14} />
        </button>
      ))}
    </div>
  );
}
