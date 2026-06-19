import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, Upload, X, Link2, ImagePlus, Tag as TagIcon, Check, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProject, updateProject, deleteProject, type Project, type BoardImage } from "@/lib/projects";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/project/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Board · ${params.id} — Atelier` },
      { name: "description", content: "Curate visual research with palette and image cards." },
    ],
  }),
  component: ProjectCanvas,
});

function normalizeHex(input: string): string | null {
  let v = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return `#${v.toLowerCase()}`;
}

function ProjectCanvas() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    setProject(getProject(id));
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [presenting]);

  const patch = (changes: Partial<Project>) => {
    if (!project) return;
    const next = { ...project, ...changes };
    setProject(next);
    updateProject(project.id, changes);
  };

  if (!hydrated) return <div className="min-h-screen bg-background" />;
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

  const images = project.images ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-2 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Boards</span>
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <div className="min-w-0">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Editing</p>
              <input
                value={project.title}
                onChange={(e) => patch({ title: e.target.value })}
                className="w-full min-w-0 truncate border-0 bg-transparent font-display text-xl leading-none outline-none focus:text-foreground sm:text-2xl"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:inline">
              {images.length.toString().padStart(2, "0")} images · {project.palette.length.toString().padStart(2, "0")} colors
            </span>
            <button
              onClick={() => setPresenting(true)}
              className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Present</span>
            </button>
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
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-12 sm:px-8">
        <PaletteBuilder palette={project.palette} onChange={(palette) => patch({ palette })} />
        <ImageBoard
          images={images}
          onChange={(next) => patch({ images: next })}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
        />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← All boards</Link>
          <span>Atelier · Auto-saved</span>
        </div>
      </footer>

      {presenting && (
        <PresentationView
          project={project}
          images={
            activeTag ? images.filter((i) => (i.tags ?? []).includes(activeTag)) : images
          }
          activeTag={activeTag}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------ Presentation ------------------------------ */

function PresentationView({
  project,
  images,
  activeTag,
  onClose,
}: {
  project: Project;
  images: BoardImage[];
  activeTag: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-background">
      <button
        onClick={onClose}
        aria-label="Exit presentation (Esc)"
        className="fixed right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center border border-foreground bg-background/80 text-foreground backdrop-blur transition-all hover:scale-105 hover:bg-foreground hover:text-background"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 font-mono-ui text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Esc to exit
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col items-center justify-center gap-16 px-8 py-24">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            {activeTag ? `Filtered · ${activeTag}` : "Presenting"}
          </p>
          <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">{project.title}</h1>
        </header>

        {project.palette.length > 0 && (
          <div className="flex w-full max-w-3xl justify-center">
            <div className="grid w-full grid-cols-4 gap-px border border-border bg-border sm:grid-cols-6 md:grid-cols-8">
              {project.palette.map((c, i) => (
                <div key={c + i} className="aspect-square" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <p className="font-display text-2xl text-muted-foreground">No images to present.</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <figure
                key={img.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${Math.min(120 + i * 60, 600)}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="shadow-premium relative aspect-[4/5] overflow-hidden border border-border bg-secondary">
                  <img
                    src={img.src}
                    alt={img.caption ?? ""}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                {img.caption && (
                  <figcaption className="font-mono-ui mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Palette Builder ----------------------------- */

function PaletteBuilder({ palette, onChange }: { palette: string[]; onChange: (p: string[]) => void }) {
  const [hex, setHex] = useState("");
  const [picker, setPicker] = useState("#1a1a1a");
  const [error, setError] = useState("");

  const add = (raw: string) => {
    const normalized = normalizeHex(raw);
    if (!normalized) {
      setError("Use #RGB or #RRGGBB");
      return;
    }
    if (palette.includes(normalized)) {
      setError("Already in palette");
      return;
    }
    onChange([...palette, normalized]);
    setHex("");
    setError("");
  };

  const remove = (c: string) => onChange(palette.filter((x) => x !== c));

  return (
    <section className="border-b border-border pb-16">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Section 01</p>
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">Color Palette Builder</h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Pick or paste hex codes. Swatches arrange into a precise, editorial row.
        </p>
      </div>

      {/* Swatches */}
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {palette.map((color, i) => (
          <Swatch key={color + i} color={color} index={i} onRemove={() => remove(color)} />
        ))}
        <AddSwatch
          hex={hex}
          setHex={setHex}
          picker={picker}
          setPicker={setPicker}
          onAdd={add}
          error={error}
        />
      </div>
    </section>
  );
}

function Swatch({ color, index, onRemove }: { color: string; index: number; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="group relative aspect-square bg-background">
      <button
        onClick={copy}
        className="block h-full w-full transition-transform duration-300 ease-out group-hover:scale-[0.97]"
        style={{ backgroundColor: color }}
        aria-label={`Copy ${color}`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/95 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-foreground opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          <span>{copied ? "Copied" : color}</span>
          <span className="text-muted-foreground">№ {(index + 1).toString().padStart(2, "0")}</span>
      </div>
      <button
        onClick={onRemove}
        aria-label="Remove color"
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center border border-foreground bg-background text-foreground opacity-0 transition-opacity duration-200 hover:bg-foreground hover:text-background group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddSwatch({
  hex,
  setHex,
  picker,
  setPicker,
  onAdd,
  error,
}: {
  hex: string;
  setHex: (v: string) => void;
  picker: string;
  setPicker: (v: string) => void;
  onAdd: (v: string) => void;
  error: string;
}) {
  return (
    <div className="relative flex aspect-square flex-col justify-between bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Add color</span>
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(hex || picker);
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2 border border-border bg-background">
          <label className="relative h-9 w-9 shrink-0 cursor-pointer border-r border-border" style={{ backgroundColor: picker }}>
            <input
              type="color"
              value={picker}
              onChange={(e) => {
                setPicker(e.target.value);
                setHex(e.target.value);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Pick color"
            />
          </label>
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#1a1a1a"
            className="font-mono-ui w-full bg-transparent py-2 pr-2 text-xs uppercase tracking-wider outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="font-mono-ui w-full border border-foreground bg-foreground py-2 text-[10px] uppercase tracking-[0.2em] text-background transition-colors hover:bg-background hover:text-foreground"
        >
          Add to palette
        </button>
        {error && (
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-destructive">{error}</p>
        )}
      </form>
    </div>
  );
}

/* ------------------------------- Image Board ------------------------------- */

function ImageBoard({ images, onChange }: { images: BoardImage[]; onChange: (next: BoardImage[]) => void }) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [caption, setCaption] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const addImage = (src: string, cap?: string) => {
    const img: BoardImage = {
      id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      src,
      caption: cap,
      addedAt: Date.now(),
      tags: [],
    };
    onChange([img, ...images]);
  };

  const remove = (id: string) => onChange(images.filter((i) => i.id !== id));

  const updateTags = (id: string, tags: string[]) => {
    onChange(images.map((i) => (i.id === id ? { ...i, tags } : i)));
  };

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    images.forEach((img) => (img.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [images]);

  const filtered = useMemo(
    () => (activeTag ? images.filter((i) => (i.tags ?? []).includes(activeTag)) : images),
    [images, activeTag],
  );

  useEffect(() => {
    if (activeTag && !allTags.some(([t]) => t === activeTag)) setActiveTag(null);
  }, [activeTag, allTags]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          addImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const submitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    addImage(urlInput.trim(), caption.trim() || undefined);
    setUrlInput("");
    setCaption("");
    setOpen(false);
  };

  return (
    <section className="pt-16">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Section 02</p>
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">Inspiration Grid</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            className="font-mono-ui inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
          <button
            onClick={() => setOpen(true)}
            className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
          >
            <Link2 className="h-3.5 w-3.5" /> Add by URL
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {(allTags.length > 0 || images.length > 0) && images.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Filter
          </span>
          <FilterPill
            label="All"
            count={images.length}
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {allTags.map(([tag, count]) => (
            <FilterPill
              key={tag}
              label={tag}
              count={count}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            />
          ))}
          {allTags.length === 0 && (
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Tag images to build filters
            </span>
          )}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative ${dragOver ? "ring-2 ring-foreground ring-offset-4 ring-offset-background" : ""}`}
      >
        {images.length === 0 ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-3 border border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <ImagePlus className="h-8 w-8" strokeWidth={1.25} />
            <p className="font-display text-2xl">Drop images, or click to upload.</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">JPG · PNG · WEBP · GIF</p>
          </button>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-secondary/40 py-24 text-center">
            <p className="font-display text-3xl">No images tagged “{activeTag}”.</p>
            <button
              onClick={() => setActiveTag(null)}
              className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground underline hover:text-foreground"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div
            key={activeTag ?? "all"}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((img, i) => (
              <ImageCard
                key={img.id}
                image={img}
                index={i + 1}
                stagger={i}
                allTags={allTags.map(([t]) => t)}
                editing={editingTagsFor === img.id}
                onStartEdit={() => setEditingTagsFor(img.id)}
                onEndEdit={() => setEditingTagsFor(null)}
                onRemove={() => remove(img.id)}
                onTagsChange={(tags) => updateTags(img.id, tags)}
                onTagClick={(t) => setActiveTag(activeTag === t ? null : t)}
                activeTag={activeTag}
              />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submitUrl}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md border border-border bg-background p-8"
          >
            <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Add image
            </p>
            <h3 className="font-display text-3xl">Paste an image URL.</h3>
            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              className="mt-6 w-full border-0 border-b border-border bg-transparent pb-3 font-display text-xl outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="font-mono-ui mt-4 w-full border-0 border-b border-border bg-transparent pb-2 text-xs uppercase tracking-[0.18em] outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="font-mono-ui border border-foreground bg-foreground px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
              >
                Add image
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono-ui inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-secondary"
      }`}
    >
      <span>{label}</span>
      <span className={active ? "text-background/70" : "text-muted-foreground"}>
        {count.toString().padStart(2, "0")}
      </span>
    </button>
  );
}

function ImageCard({
  image,
  index,
  stagger,
  allTags,
  editing,
  onStartEdit,
  onEndEdit,
  onRemove,
  onTagsChange,
  onTagClick,
  activeTag,
}: {
  image: BoardImage;
  index: number;
  stagger: number;
  allTags: string[];
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onRemove: () => void;
  onTagsChange: (tags: string[]) => void;
  onTagClick: (tag: string) => void;
  activeTag: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const [draft, setDraft] = useState("");
  const tags = image.tags ?? [];

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t || tags.includes(t)) return;
    onTagsChange([...tags, t]);
    setDraft("");
  };
  const removeTag = (t: string) => onTagsChange(tags.filter((x) => x !== t));

  return (
    <figure
      className="group relative animate-fade-in"
      style={{ animationDelay: `${Math.min(stagger * 40, 320)}ms`, animationFillMode: "backwards" }}
    >
      <div className="shadow-premium group-hover:shadow-premium-hover relative aspect-[4/5] overflow-hidden border border-border bg-secondary transition-shadow duration-500">
        {!broken ? (
          <img
            src={image.src}
            alt={image.caption ?? `Inspiration ${index}`}
            onError={() => setBroken(true)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Image unavailable
          </div>
        )}

        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={onStartEdit}
            aria-label="Edit tags"
            className="inline-flex h-8 w-8 items-center justify-center border border-foreground bg-background/90 text-foreground backdrop-blur hover:bg-foreground hover:text-background"
          >
            <TagIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            aria-label="Remove image"
            className="inline-flex h-8 w-8 items-center justify-center border border-foreground bg-background/90 text-foreground backdrop-blur hover:bg-foreground hover:text-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {tags.length > 0 && !editing && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.preventDefault();
                  onTagClick(t);
                }}
                className={`font-mono-ui border px-2 py-1 text-[9px] uppercase tracking-[0.18em] backdrop-blur transition-colors ${
                  activeTag === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/40 bg-background/85 text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                {t}
              </button>
            ))}
            {tags.length > 3 && (
              <span className="font-mono-ui border border-foreground/40 bg-background/85 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-foreground backdrop-blur">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="truncate">{image.caption ?? "Untitled"}</span>
        <span className="shrink-0">№ {index.toString().padStart(3, "0")}</span>
      </figcaption>

      {editing && (
        <div className="mt-3 animate-fade-in border border-foreground bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">Tags</span>
            <button
              onClick={onEndEdit}
              className="font-mono-ui inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" /> Done
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="font-mono-ui inline-flex items-center gap-1 border border-border bg-secondary px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
              >
                {t}
                <button
                  onClick={() => removeTag(t)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${t}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                No tags yet
              </span>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTag(draft);
            }}
            className="mt-3 flex items-center gap-2 border border-border"
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Furniture, Lighting…"
              className="font-mono-ui w-full bg-transparent px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="font-mono-ui shrink-0 border-l border-border bg-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
            >
              Add
            </button>
          </form>
          {allTags.filter((t) => !tags.includes(t)).length > 0 && (
            <div className="mt-3">
              <p className="font-mono-ui mb-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Quick add
              </p>
              <div className="flex flex-wrap gap-1">
                {allTags
                  .filter((t) => !tags.includes(t))
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => addTag(t)}
                      className="font-mono-ui border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                    >
                      + {t}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}