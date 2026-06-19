import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Image as ImageIcon, Type, Palette, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getProject, updateProject, deleteProject, type BoardCard, type Project } from "@/lib/projects";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/project/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Board · ${params.id} — Atelier` },
      { name: "description", content: "Curate visual research on an infinite canvas." },
    ],
  }),
  component: ProjectCanvas,
});

function ProjectCanvas() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | "image" | "text" | "color">(null);
  const [draft, setDraft] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; offX: number; offY: number } | null>(null);

  useEffect(() => {
    setProject(getProject(id));
    setHydrated(true);
  }, [id]);

  const save = (cards: BoardCard[]) => {
    if (!project) return;
    const next = { ...project, cards };
    setProject(next);
    updateProject(project.id, { cards });
  };

  const addCard = () => {
    if (!project || !adding) return;
    const content =
      adding === "color"
        ? draft || "#cccccc"
        : adding === "text"
        ? draft || "A new note."
        : draft;
    if (adding === "image" && !content) return;
    const card: BoardCard = {
      id: `c-${Date.now().toString(36)}`,
      kind: adding,
      x: 80 + Math.random() * 200,
      y: 80 + Math.random() * 200,
      w: adding === "text" ? 260 : adding === "color" ? 180 : 280,
      h: adding === "text" ? 160 : adding === "color" ? 180 : 320,
      content,
      rotation: (Math.random() - 0.5) * 4,
    };
    save([...project.cards, card]);
    setAdding(null);
    setDraft("");
  };

  const onMouseDown = (e: React.MouseEvent, card: BoardCard) => {
    setSelected(card.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      id: card.id,
      offX: e.clientX - rect.left - card.x,
      offY: e.clientY - rect.top - card.y,
    };
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds || !project) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, e.clientX - rect.left - ds.offX);
      const y = Math.max(0, e.clientY - rect.top - ds.offY);
      const cards = project.cards.map((c) => (c.id === ds.id ? { ...c, x, y } : c));
      setProject({ ...project, cards });
    };
    const up = () => {
      if (dragState.current && project) {
        updateProject(project.id, { cards: project.cards });
      }
      dragState.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [project]);

  const removeCard = (cid: string) => {
    if (!project) return;
    save(project.cards.filter((c) => c.id !== cid));
    setSelected(null);
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="font-display text-3xl">Board not found.</p>
        <Link to="/" className="font-mono-ui text-[11px] uppercase tracking-[0.2em] underline">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Boards
          </Link>
          <span className="text-border">/</span>
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Editing</p>
            <h1 className="font-display text-xl leading-none">{project.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-ui hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:inline">
            {project.cards.length.toString().padStart(2, "0")} cards
          </span>
          <button
            onClick={() => {
              if (confirm("Delete this board?")) {
                deleteProject(project.id);
                navigate({ to: "/" });
              }
            }}
            className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-background"
            aria-label="Delete board"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="relative h-full w-full overflow-auto"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--color-foreground) 12%, transparent) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onClick={() => setSelected(null)}
        >
          {project.cards.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-5xl">An empty canvas.</p>
                <p className="font-mono-ui mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Add an image, note, or color from the dock below.
                </p>
              </div>
            </div>
          )}
          {project.cards.map((card) => (
            <div
              key={card.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, card);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(card.id);
              }}
              className={`absolute cursor-grab select-none border bg-card shadow-sm transition-shadow active:cursor-grabbing ${
                selected === card.id ? "border-foreground shadow-lg" : "border-border"
              }`}
              style={{
                left: card.x,
                top: card.y,
                width: card.w,
                height: card.h,
                transform: `rotate(${card.rotation ?? 0}deg)`,
              }}
            >
              {selected === card.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCard(card.id);
                  }}
                  className="absolute -right-3 -top-3 z-10 inline-flex h-6 w-6 items-center justify-center border border-foreground bg-background text-foreground hover:bg-foreground hover:text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {card.kind === "image" && (
                <img src={card.content} alt="" className="h-full w-full object-cover" draggable={false} />
              )}
              {card.kind === "text" && (
                <div className="flex h-full w-full items-center justify-center p-5">
                  <p className="font-display text-2xl leading-tight text-card-foreground">{card.content}</p>
                </div>
              )}
              {card.kind === "color" && (
                <div className="flex h-full w-full flex-col">
                  <div className="flex-1" style={{ backgroundColor: card.content }} />
                  <div className="border-t border-border px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-card-foreground">
                    {card.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Palette strip */}
        <div className="pointer-events-none absolute left-6 top-6 flex gap-1">
          {project.palette.map((c) => (
            <span key={c} className="h-6 w-6 border border-border" style={{ backgroundColor: c }} />
          ))}
        </div>

        {/* Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 border border-border bg-background p-1 shadow-lg">
            <DockBtn icon={<ImageIcon className="h-4 w-4" />} label="Image" onClick={() => setAdding("image")} />
            <DockBtn icon={<Type className="h-4 w-4" />} label="Note" onClick={() => setAdding("text")} />
            <DockBtn icon={<Palette className="h-4 w-4" />} label="Color" onClick={() => setAdding("color")} />
          </div>
        </div>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
          onClick={() => setAdding(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCard();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md border border-border bg-background p-8"
          >
            <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Add {adding}
            </p>
            <h3 className="font-display text-3xl">
              {adding === "image" && "Paste an image URL."}
              {adding === "text" && "Write a note."}
              {adding === "color" && "Enter a hex color."}
            </h3>
            {adding === "text" ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="mt-6 w-full resize-none border border-border bg-transparent p-3 font-display text-xl outline-none focus:border-foreground"
              />
            ) : (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={adding === "color" ? "#1a1a1a" : "https://…"}
                className="mt-6 w-full border-0 border-b border-border bg-transparent pb-3 font-display text-xl outline-none placeholder:text-muted-foreground focus:border-foreground"
              />
            )}
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdding(null)}
                className="font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="font-mono-ui border border-foreground bg-foreground px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
              >
                Add to board
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function DockBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-4 py-2 text-foreground transition-colors hover:bg-foreground hover:text-background"
    >
      {icon}
      <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}