import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Maximize2, Plus, Send, Upload, X } from "lucide-react";
import { extractDominantColors } from "@/lib/extract-colors";

export const Route = createFileRoute("/guest")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Guest canvas — Atelier" },
      { name: "description", content: "Try Atelier as a guest. Upload an image, extract a palette, present." },
    ],
  }),
  component: GuestCanvas,
});

function GuestCanvas() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<{ src: string; caption: string } | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [presenting, setPresenting] = useState(false);
  const [gate, setGate] = useState<null | "publish" | "save" | "new">(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (image?.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
    };
  }, [image]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPresenting(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [presenting]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const colors = await extractDominantColors(file, 5).catch(() => []);
      if (image?.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
      setImage({ src: URL.createObjectURL(file), caption: file.name });
      if (colors.length > 0) setPalette(colors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex shrink-0 items-center gap-2 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
            <span className="hidden text-border sm:inline">/</span>
            <div className="min-w-0">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Guest canvas · not saved</p>
              <h1 className="truncate font-display text-xl leading-none sm:text-2xl">Untitled exploration</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setGate("new")}
              className="font-mono-ui hidden items-center gap-2 border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" /> New board
            </button>
            <button
              onClick={() => image && setPresenting(true)}
              disabled={!image}
              className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground disabled:opacity-40"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Present</span>
            </button>
            <button
              onClick={() => setGate("publish")}
              className="font-mono-ui inline-flex items-center gap-2 border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        </div>
        <div className="border-t border-border bg-secondary/40">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:px-8">
            <span>You're browsing as a guest. Sign up to save & share.</span>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="text-foreground underline underline-offset-4 hover:text-foreground/70"
            >
              Create account →
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-12 sm:px-8">
        {/* Palette row */}
        <section className="border-b border-border pb-12">
          <div className="mb-6 flex items-end justify-between gap-2">
            <div>
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Section 01</p>
              <h2 className="font-display text-3xl sm:text-4xl">Color Palette</h2>
            </div>
            <p className="max-w-xs text-right text-xs text-muted-foreground">
              Extracted automatically from your upload.
            </p>
          </div>
          <div className="grid grid-cols-5 gap-px overflow-hidden border border-border bg-border">
            {(palette.length ? palette : ["#1a1a1a", "#2a2a2a", "#3a3a3a", "#d4a574", "#f5f0e6"]).map((c, i) => (
              <div key={c + i} className="aspect-square relative" style={{ backgroundColor: c }}>
                <span className="font-mono-ui absolute inset-x-0 bottom-0 bg-background/90 px-2 py-1 text-center text-[9px] uppercase tracking-[0.18em] opacity-0 transition-opacity hover:opacity-100">
                  {palette.length ? c : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Image */}
        <section className="pt-12">
          <div className="mb-6 flex items-end justify-between gap-2">
            <div>
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Section 02</p>
              <h2 className="font-display text-3xl sm:text-4xl">Inspiration</h2>
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> {image ? "Replace" : busy ? "Uploading…" : "Upload one image"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {!image ? (
            <button
              onClick={() => fileInput.current?.click()}
              className="flex aspect-[16/8] w-full flex-col items-center justify-center gap-3 border border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <Upload className="h-8 w-8" strokeWidth={1.25} />
              <p className="font-display text-2xl">Drop a single image to begin.</p>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">Guest limit · 1 image</p>
            </button>
          ) : (
            <figure className="mx-auto max-w-3xl animate-fade-in">
              <div className="shadow-premium relative aspect-[4/5] overflow-hidden border border-border bg-secondary">
                <img src={image.src} alt={image.caption} className="h-full w-full object-cover" />
              </div>
              <figcaption className="font-mono-ui mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {image.caption}
              </figcaption>
            </figure>
          )}
        </section>
      </main>

      {/* Presentation */}
      {presenting && image && (
        <div className="fixed inset-0 z-40 animate-fade-in overflow-y-auto bg-background">
          <button
            onClick={() => setPresenting(false)}
            aria-label="Exit presentation"
            className="fixed right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center border border-foreground bg-background/80 text-foreground backdrop-blur hover:bg-foreground hover:text-background"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col items-center justify-center gap-16 px-8 py-24">
            <header className="text-center">
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Guest preview
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">Untitled exploration</h1>
            </header>
            {palette.length > 0 && (
              <div className="grid w-full max-w-3xl grid-cols-5 gap-px border border-border bg-border">
                {palette.map((c, i) => (
                  <div key={c + i} className="aspect-square" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
            <figure className="w-full max-w-2xl">
              <div className="shadow-premium relative aspect-[4/5] overflow-hidden border border-border bg-secondary">
                <img src={image.src} alt={image.caption} className="h-full w-full object-cover" />
              </div>
            </figure>
          </div>
        </div>
      )}

      {gate && <UpgradeModal reason={gate} onClose={() => setGate(null)} onAuth={() => navigate({ to: "/auth" })} />}
    </div>
  );
}

function UpgradeModal({
  reason,
  onClose,
  onAuth,
}: {
  reason: "publish" | "save" | "new";
  onClose: () => void;
  onAuth: () => void;
}) {
  const verb = reason === "new" ? "create new boards" : reason === "save" ? "save your work" : "publish your boards";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border border-border bg-background shadow-2xl"
      >
        {/* Decorative palette ribbon */}
        <div className="grid h-2 grid-cols-5">
          {["#0f0f0f", "#d4a574", "#4a7a8c", "#8b4a5c", "#f5f0e6"].map((c) => (
            <div key={c} style={{ backgroundColor: c }} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="absolute right-4 top-6 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-9 pb-9 pt-10">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            — Free account required
          </p>
          <h2 className="mt-3 font-display text-[2.25rem] leading-[1.02]">
            Create a free account to <em className="italic text-foreground/90">save</em> your boards.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Sign up to {verb} and share them with clients via a private link. Your guest canvas stays here while you do.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onAuth}
              className="font-mono-ui group inline-flex w-full items-center justify-between border border-foreground bg-foreground px-5 py-3.5 text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-background hover:text-foreground sm:flex-1"
            >
              <span>Sign up free</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              onClick={onAuth}
              className="font-mono-ui inline-flex w-full items-center justify-center border border-border px-5 py-3.5 text-[11px] uppercase tracking-[0.22em] hover:bg-secondary sm:flex-1"
            >
              Sign in
            </button>
          </div>
          <p className="font-mono-ui mt-6 text-center text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            No credit card · 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}