import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, Upload, X, Link2, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setProject(getProject(id));
    setHydrated(true);
  }, [id]);

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
        <ImageBoard images={images} onChange={(next) => patch({ images: next })} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← All boards</Link>
          <span>Atelier · Auto-saved</span>
        </div>
      </footer>
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
  const fileInput = useRef<HTMLInputElement>(null);

  const addImage = (src: string, cap?: string) => {
    const img: BoardImage = {
      id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      src,
      caption: cap,
      addedAt: Date.now(),
    };
    onChange([img, ...images]);
  };

  const remove = (id: string) => onChange(images.filter((i) => i.id !== id));

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
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((img, i) => (
              <ImageCard key={img.id} image={img} index={i + 1} onRemove={() => remove(img.id)} />
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

function ImageCard({ image, index, onRemove }: { image: BoardImage; index: number; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className="group relative">
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
        <button
          onClick={onRemove}
          aria-label="Remove image"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-foreground bg-background/90 text-foreground opacity-0 backdrop-blur transition-opacity duration-200 hover:bg-foreground hover:text-background group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="truncate">{image.caption ?? "Untitled"}</span>
        <span className="shrink-0">№ {index.toString().padStart(3, "0")}</span>
      </figcaption>
    </figure>
  );
}