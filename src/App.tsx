import { useState, useEffect, useRef } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  FolderOpen,
  SlidersHorizontal,
  Sparkles,
  FileText,
  Video,
  Search,
  MoreHorizontal,
  Sun,
  Moon,
  Monitor,
  Check,
  Download,
  Trash2,
  Copy,
  Flower2,
} from "lucide-react";
import {
  createProject,
  initialLibrary,
  clone,
  uid,
  templateNames,
  type Library,
  type Template,
  type Project,
} from "./model";
import { loadLibrary, saveLibrary, downloadProject } from "./storage";
import { Chart } from "./Chart";
import { Workspace } from "./Workspace";
import { ImportDialog } from "./ImportDialog";
import { Modal, Field, Notice } from "./ui";
export default function App() {
  const [library, setLibrary] = useState<Library>(),
    [active, setActive] = useState<string>(),
    [modal, setModal] = useState<
      | "create"
      | "settings"
      | "written"
      | "tutorial"
      | "image"
      | "project"
      | "delete"
    >(),
    [deleteId, setDeleteId] = useState(""),
    [saveStatus, setSaveStatus] = useState("Loading…"),
    [loadError, setLoadError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState<"all" | "mine" | "examples">("all"),
    [template, setTemplate] = useState<Template>("blanket"),
    [name, setName] = useState(""),
    [menu, setMenu] = useState<string>(),
    [sort, setSort] = useState<"recent" | "name">("recent");
  const saving = useRef(Promise.resolve()),
    alive = useRef(true),
    saveGeneration = useRef(0);
  useEffect(() => {
    alive.current = true;
    loadLibrary()
      .then((l) => {
        if (alive.current) {
          setLibrary(l || initialLibrary());
          setSaveStatus("Saved");
        }
      })
      .catch((e) => {
        if (alive.current) {
          setLoadError((e as Error).message);
          setSaveStatus("Save failed");
        }
      });
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!library) return;
    const generation = ++saveGeneration.current;
    setSaveStatus("Saving…");
    const t = setTimeout(() => {
      saving.current = saving.current
        .catch(() => {})
        .then(() => saveLibrary(library))
        .then(() => {
          if (alive.current && generation === saveGeneration.current)
            setSaveStatus("Saved");
        })
        .catch(() => {
          if (alive.current && generation === saveGeneration.current)
            setSaveStatus("Save failed");
        });
    }, 350);
    return () => clearTimeout(t);
  }, [library]);
  useEffect(() => {
    const theme = library?.settings.theme || "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [library?.settings.theme]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveStatus === "Saving…" || saveStatus === "Save failed") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus]);
  const update = (p: Project) =>
    setLibrary((l) =>
      l
        ? {
            ...l,
            projects: l.projects.map((old) => (old.id === p.id ? p : old)),
          }
        : l,
    );
  const add = (p: Project) => {
    setLibrary((l) => (l ? { ...l, projects: [p, ...l.projects] } : l));
    setActive(p.id);
    setModal(undefined);
  };
  if (!library)
    return (
      <main className="loading-page">
        <Flower2 size={40} />
        <h1>Crochet Studio</h1>
        {loadError ? (
          <>
            <Notice error>
              {loadError} Your existing library has not been overwritten.
            </Notice>
            <button onClick={() => location.reload()}>Retry loading</button>
            <p>
              Enable IndexedDB storage in your browser. No cloud account is
              required.
            </p>
          </>
        ) : (
          <p>Opening your studio…</p>
        )}
      </main>
    );
  const project = library.projects.find((p) => p.id === active);
  if (project)
    return (
      <>
        <Workspace
          key={project.id}
          project={project}
          settings={library.settings}
          saveStatus={saveStatus}
          onUpdate={update}
          onSettings={(s) => setLibrary({ ...library, settings: s })}
          onBack={() => setActive(undefined)}
        />
        {saveStatus === "Save failed" && (
          <div className="save-failure" role="alert">
            Autosave failed. Keep this tab open and export a project backup.
            <button onClick={() => downloadProject(project)}>
              Export backup
            </button>
            <button onClick={() => setLibrary({ ...library })}>
              Retry save
            </button>
          </div>
        )}
      </>
    );
  const shown = library.projects
    .filter(
      (p) =>
        (filter === "all" ||
          (filter === "examples" ? p.example : !p.example)) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updated.localeCompare(a.updated),
    );
  const bloom =
    library.projects.find((p) => p.template === "blanket") ||
    createProject("blanket");
  return (
    <div className="home-shell">
      <aside className="home-sidebar">
        <a className="wordmark" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon">
            <Flower2 size={27} />
          </span>
          <span>
            Crochet
            <br />
            <b>Studio</b>
          </span>
        </a>
        <div className="sidebar-section">
          <span className="eyebrow">WORKSPACE</span>
          <button
            className="nav-item active"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
          >
            <FolderOpen size={18} />
            My projects<span>{library.projects.length}</span>
          </button>
          <button className="nav-item" onClick={() => setModal("create")}>
            <Plus size={18} />
            Create a design
          </button>
          <button className="nav-item" onClick={() => setModal("written")}>
            <FileText size={18} />
            Adapt a pattern
          </button>
          <button className="nav-item" onClick={() => setModal("tutorial")}>
            <Video size={18} />
            Import a tutorial
          </button>
        </div>
        <div className="sidebar-foot">
          <div className="local-note">
            <span className="tiny-dot" />
            <div>
              <strong>Your own little studio.</strong>
              <p>
                Saved in this browser.
                <br />
                Export projects for backup.
              </p>
            </div>
          </div>
          <button className="nav-item" onClick={() => setModal("settings")}>
            <SlidersHorizontal size={18} />
            Studio settings
          </button>
          <div className="sidebar-signature">
            <span className="avatar">CS</span>
            <span>
              Personal workspace<small>No account needed</small>
            </span>
          </div>
        </div>
      </aside>
      <main className="home-main">
        <header className="home-topbar">
          <span>
            Workspace <span className="breadcrumb-slash">/</span>
            <strong>My projects</strong>
          </span>
          <div>
            <span className="save-status">
              <span className="status-dot" />
              {saveStatus === "Saved" ? "All changes saved" : saveStatus}
            </span>
            <button
              className="icon-button"
              aria-label="Studio settings"
              onClick={() => setModal("settings")}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </header>
        {saveStatus === "Save failed" && (
          <Notice error>
            Autosave failed. Export your projects before closing this tab.
            <button onClick={() => setLibrary({ ...library })}>
              Retry save
            </button>
          </Notice>
        )}
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-star">✳</span> A SPACE FOR SLOW CREATIVITY
            </span>
            <h1>
              A little yarn.
              <br />A world of possibilities.
            </h1>
            <p>
              Turn an idea into a pattern that feels like you.
              <br className="desktop-break" />
              Design, adapt, and crochet — one stitch at a time.
            </p>
            <button
              className="primary"
              onClick={() => {
                setTemplate("blanket");
                setName("");
                setModal("create");
              }}
            >
              <Plus size={18} />
              Create a design <ArrowUpRight size={17} />
            </button>
            <span className="hero-footnote">
              Start with a blank canvas or a little inspiration.
            </span>
          </div>
          <div className="hero-art">
            <div className="hero-art-label">
              <span className="tiny-dot" />
              THE LITTLE BLOOM STUDY<span>36 × 32</span>
            </div>
            <div className="hero-fabric">
              <Chart small piece={bloom.pieces[0]} palette={bloom.palette} />
            </div>
            <div className="floating-yarn">
              <span style={{ background: "#e8dfcf" }} />
              <span style={{ background: "#65745a" }} />
              <span style={{ background: "#be785e" }} />
              <small>Made of simple stitches.</small>
            </div>
            <span className="art-coordinate">
              a small idea, stitch by stitch ↗
            </span>
          </div>
        </section>
        <section className="quick-paths">
          <button onClick={() => setModal("written")}>
            <span className="path-icon">
              <ScalingIcon />
            </span>
            <span>
              <strong>Make a pattern fit</strong>
              <small>Keep the motif. Find your dimensions.</small>
            </span>
            <ArrowUpRight size={18} />
          </button>
          <button onClick={() => setModal("tutorial")}>
            <span className="path-icon">
              <Video size={22} />
            </span>
            <span>
              <strong>Bring a tutorial along</strong>
              <small>A link, your transcript, a guided project.</small>
            </span>
            <ArrowUpRight size={18} />
          </button>
          <button onClick={() => setModal("image")}>
            <span className="path-icon">
              <Sparkles size={22} />
            </span>
            <span>
              <strong>From image to artwork</strong>
              <small>A favorite image, reimagined in stitches.</small>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </section>
        <section className="project-section">
          <div className="projects-heading">
            <div>
              <h2>On your hook</h2>
              <p>Pick up where you left off, or begin something new.</p>
            </div>
            <button
              className="quiet-button"
              onClick={() => {
                setName("");
                setModal("create");
              }}
            >
              <Plus size={17} />
              New project
            </button>
          </div>
          <div className="project-filters">
            <div className="filter-tabs">
              {(["all", "mine", "examples"] as const).map((f) => (
                <button
                  className={filter === f ? "active" : ""}
                  key={f}
                  onClick={() => setFilter(f)}
                >
                  {
                    {
                      all: "All projects",
                      mine: "My designs",
                      examples: "Studio examples",
                    }[f]
                  }
                </button>
              ))}
            </div>
            <div className="project-search">
              <label>
                <Search size={16} />
                <input
                  aria-label="Search projects"
                  placeholder="Find a project…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="Sort projects"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="recent">Recently edited</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>
          <div className="project-grid">
            {shown.map((p, i) => (
              <article className="project-card" key={p.id}>
                <button
                  className={`project-art art-${i % 4}`}
                  aria-label={`Open ${p.name}`}
                  onClick={() => setActive(p.id)}
                >
                  <div className="project-art-canvas">
                    <Chart small piece={p.pieces[0]} palette={p.palette} />
                  </div>
                  <span className="preview-tag">
                    {p.example
                      ? "STUDIO EXAMPLE"
                      : p.session
                        ? "IN PROGRESS"
                        : "YOUR DESIGN"}
                  </span>
                  <span className="art-arrow">
                    <ArrowUpRight size={20} />
                  </span>
                </button>
                <div className="project-card-text">
                  <div>
                    <button
                      className="project-name"
                      onClick={() => setActive(p.id)}
                    >
                      {p.name}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Actions for ${p.name}`}
                      onClick={() => setMenu(menu === p.id ? undefined : p.id)}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                    {menu === p.id && (
                      <div className="project-menu">
                        <button
                          onClick={() => {
                            const n = clone(p);
                            n.id = uid();
                            n.name = n.name.slice(0, 190) + " copy";
                            n.example = false;
                            add(n);
                            setMenu(undefined);
                          }}
                        >
                          <Copy size={15} />
                          Duplicate
                        </button>
                        <button
                          onClick={() => {
                            downloadProject(p);
                            setMenu(undefined);
                          }}
                        >
                          <Download size={15} />
                          Export backup
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(p.id);
                            setModal("delete");
                            setMenu(undefined);
                          }}
                        >
                          <Trash2 size={15} />
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
                  <p>
                    {templateNames[p.template]}
                    <span>·</span>
                    {p.pieces[0].width} × {p.pieces[0].height}
                  </p>
                  <div className="project-card-foot">
                    <span>
                      {p.session
                        ? `Step ${p.session.cursor + 1} · frozen r${p.session.revision}`
                        : p.adapted
                          ? "Adapted pattern"
                          : `${p.pieces.length} ${p.pieces.length === 1 ? "panel" : "panels"} · ${p.terminology} terms`}
                    </span>
                    <button onClick={() => setActive(p.id)}>
                      {p.session ? "Resume" : "Open studio"}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!shown.length && (
              <div className="empty-projects">
                <Flower2 size={32} />
                <h3>
                  {search
                    ? "No matching projects."
                    : "Your next idea starts here."}
                </h3>
                <p>
                  {search
                    ? "Try a different name."
                    : "Create a design or import a pattern to make this space yours."}
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setModal("create");
                  }}
                >
                  Create a design
                </button>
              </div>
            )}
          </div>
        </section>
        <footer className="home-footer">
          <span>
            <Flower2 size={15} /> Thoughtfully made for the things you make.
          </span>
          <button className="text-button" onClick={() => setModal("project")}>
            Restore a project backup <ArrowUpRight size={14} />
          </button>
        </footer>
      </main>
      {modal === "create" && (
        <Modal
          title="What will you make?"
          subtitle="Choose a supported flat-panel starting point. Details can come later."
          onClose={() => setModal(undefined)}
        >
          <div className="template-grid">
            {(Object.entries(templateNames) as [Template, string][]).map(
              ([id, label]) => (
                <button
                  className={template === id ? "active" : ""}
                  key={id}
                  onClick={() => setTemplate(id)}
                >
                  <span>
                    {
                      {
                        blanket: "▦",
                        beanie: "◠",
                        scarf: "▥",
                        cushion: "▣",
                        tote: "▤",
                        custom: "＋",
                      }[id]
                    }
                  </span>
                  <strong>{label}</strong>
                  <small>
                    {id === "tote"
                      ? "Two rectangular panels"
                      : id === "beanie"
                        ? "Crown-to-brim stitch axis"
                        : "Flat alternating-row panel"}
                  </small>
                  {template === id && <Check size={15} />}
                </button>
              ),
            )}
          </div>
          <Field label="Project name (optional)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Something you’re excited to make"
              maxLength={200}
            />
          </Field>
          <Notice>
            Single or half double crochet, flat panels, editable assembly.
            Template construction needs crochet review; shaped garments and
            rounds are outside this release.
          </Notice>
          <div className="modal-footer">
            <button onClick={() => setModal(undefined)}>Cancel</button>
            <button
              className="primary"
              onClick={() =>
                add(createProject(template, name.trim() || undefined))
              }
            >
              Open my canvas <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {["written", "tutorial", "image", "project"].includes(modal || "") && (
        <ImportDialog
          initial={modal as "written" | "tutorial" | "image" | "project"}
          onClose={() => setModal(undefined)}
          onImport={add}
        />
      )}
      {modal === "settings" && (
        <Modal
          title="Make yourself at home."
          subtitle="Studio preferences are saved in this browser."
          onClose={() => setModal(undefined)}
        >
          <h4>Appearance</h4>
          <div className="appearance-options">
            {(
              [
                ["system", Monitor, "System"],
                ["light", Sun, "Light"],
                ["dark", Moon, "Dark"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                className={library.settings.theme === value ? "active" : ""}
                onClick={() =>
                  setLibrary({
                    ...library,
                    settings: { ...library.settings, theme: value },
                  })
                }
              >
                <Icon size={23} />
                {label}
              </button>
            ))}
          </div>
          <Field label="Technique diagram handedness">
            <select
              value={library.settings.hand}
              onChange={(e) =>
                setLibrary({
                  ...library,
                  settings: {
                    ...library.settings,
                    hand: e.target.value as "left" | "right",
                  },
                })
              }
            >
              <option value="right">Right-handed</option>
              <option value="left">Left-handed</option>
            </select>
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={library.settings.beginner}
              onChange={(e) =>
                setLibrary({
                  ...library,
                  settings: { ...library.settings, beginner: e.target.checked },
                })
              }
            />
            Beginner Mode by default
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={library.settings.symbols}
              onChange={(e) =>
                setLibrary({
                  ...library,
                  settings: { ...library.settings, symbols: e.target.checked },
                })
              }
            />
            Show yarn symbols in the chart
          </label>
          <Notice>
            Projects are stored in IndexedDB on this device and browser. Export
            backups before clearing browser data. No account, cloud sync, AI
            integration, or public publishing is enabled.
          </Notice>
          <div className="modal-footer">
            <button className="primary" onClick={() => setModal(undefined)}>
              Done <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "delete" && (
        <Modal
          title="Delete this project?"
          subtitle="This removes the local copy and its crochet progress."
          onClose={() => setModal(undefined)}
        >
          <p>Export a backup first if you may want it later.</p>
          <div className="modal-footer">
            <button onClick={() => setModal(undefined)}>Keep project</button>
            <button
              className="danger"
              onClick={() => {
                setLibrary({
                  ...library,
                  projects: library.projects.filter((p) => p.id !== deleteId),
                });
                setModal(undefined);
              }}
            >
              Delete local project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ScalingIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="9" width="12" height="12" rx="2" />
      <path d="M9 3h12v12M21 3L11 13" />
    </svg>
  );
}
