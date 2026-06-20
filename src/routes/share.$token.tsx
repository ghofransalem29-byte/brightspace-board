import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Project, BoardImage } from "@/lib/projects";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared board — Atelier" },
      { name: "description", content: "A shared visual mood board." },
    ],
  }),
  component: SharedBoard,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="font-display text-2xl">Something went wrong.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="font-display text-2xl">Board not found.</p>
    </div>
  ),
});

function SharedBoard() {
  const { token } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<BoardImage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from("projects")
        .select("*")
        .eq("share_token", token)
        .maybeSingle();
      if (cancelled) return;
      if (!p) {
        setLoaded(true);
        return;
      }
      const { data: items } = await supabase
        .from("moodboard_items")
        .select("*")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setProject({
        id: p.id,
        title: p.title,
        description: p.description,
        cover: p.cover,
        palette: p.palette ?? [],
        createdAt: new Date(p.created_at).getTime(),
      });
      setImages(
        (items ?? []).map((r) => ({
          id: r.id,
          src: r.src,
          storagePath: r.storage_path,
          caption: r.caption,
          addedAt: new Date(r.created_at).getTime(),
          tags: r.tags ?? [],
        })),
      );
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!loaded) return <div className="min-h-screen bg-background" />;
  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="font-display text-3xl">This board isn't shared.</p>
        <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          The link may have been revoked.
        </p>
      </div>
    );
  }

  const allTags = Array.from(new Set(images.flatMap((i) => i.tags))).sort();
  const visible = activeTag ? images.filter((i) => i.tags.includes(activeTag)) : images;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              View-only · Shared board
            </p>
            <h1 className="truncate font-display text-xl leading-none sm:text-2xl">{project.title}</h1>
          </div>
          <Link
            to="/"
            className="font-mono-ui shrink-0 border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
          >
            Atelier
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-12 sm:px-8">
        {project.palette.length > 0 && (
          <section className="mb-12">
            <p className="mb-3 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Palette</p>
            <div className="flex flex-wrap gap-2">
              {project.palette.map((c, i) => (
                <div key={i} className="flex items-center gap-2 border border-border px-2 py-1.5">
                  <span className="h-5 w-5 rounded-sm border border-border" style={{ background: c }} />
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">{c}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`font-mono-ui rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                activeTag === null
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`font-mono-ui rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  activeTag === tag
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((img) => (
            <figure key={img.id} className="group overflow-hidden border border-border bg-muted/20">
              <img
                src={img.src}
                alt={img.caption ?? ""}
                className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {img.tags.length > 0 && (
                <figcaption className="flex flex-wrap gap-1 p-2">
                  {img.tags.map((t) => (
                    <span
                      key={t}
                      className="font-mono-ui rounded-full border border-border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="py-20 text-center font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            No images on this board yet.
          </p>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Shared via Atelier</span>
          <Link to="/" className="hover:text-foreground">Create your own →</Link>
        </div>
      </footer>
    </div>
  );
}