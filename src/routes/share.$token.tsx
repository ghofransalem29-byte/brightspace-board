import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, X, MessageSquare, Check, Pencil, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Project, BoardImage } from "@/lib/projects";
import {
  useBoardFeedback,
  useClientIdentity,
  relativeTime,
  type ClientIdentity,
} from "@/lib/feedback";

export const Route = createFileRoute("/share/$token")({
  loader: async ({ params }) => {
    const { data: p } = await supabase
      .from("projects")
      .select("id,title,description,cover,palette,created_at,share_token")
      .eq("share_token", params.token)
      .maybeSingle();
    if (!p) return { project: null, firstImage: null as string | null };
    const { data: first } = await supabase
      .from("moodboard_items")
      .select("src")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { project: p, firstImage: first?.src ?? p.cover ?? null };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.project?.title
      ? `${loaderData.project.title} — Atelier`
      : "Shared board — Atelier";
    const description =
      loaderData?.project?.description ?? "An aesthetic concept board";
    const image = loaderData?.firstImage ?? undefined;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
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
  const [activeTag, setActiveTag] = useState<string>("__all");
  const [activeImage, setActiveImage] = useState<BoardImage | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);

  const { identity, setName } = useClientIdentity();
  const { reactions, feedback, toggleReaction, addComment } = useBoardFeedback(project?.id);

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

  // First-visit name prompt
  useEffect(() => {
    if (loaded && project && identity.id && !identity.name) setNameOpen(true);
  }, [loaded, project, identity.id, identity.name]);

  // Reaction tallies per image
  const tallies = useMemo(() => {
    const m = new Map<string, { love: number; pass: number; mine: "love" | "pass" | null }>();
    for (const r of reactions) {
      const t = m.get(r.itemId) ?? { love: 0, pass: 0, mine: null };
      if (r.kind === "love") t.love += 1;
      else t.pass += 1;
      if (r.clientId === identity.id) t.mine = r.kind;
      m.set(r.itemId, t);
    }
    return m;
  }, [reactions, identity.id]);

  const boardDecision = useMemo(() => feedback.find((f) => f.decision && !f.itemId) ?? null, [feedback]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    images.forEach((i) => (i.tags ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [images]);

  const visibleImages = useMemo(
    () =>
      activeTag === "__all"
        ? images
        : images.filter((i) => (i.tags ?? []).includes(activeTag)),
    [images, activeTag],
  );

  const handleReact = (img: BoardImage, kind: "love" | "pass") => {
    if (!identity.name) {
      setNameOpen(true);
      return;
    }
    toggleReaction(img.id, kind, identity);
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Client review · Shared board
            </p>
            <h1 className="truncate font-display text-xl leading-tight sm:text-2xl">{project.title}</h1>
            <p className="mt-1 truncate font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Shared by the designer
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setNameEditOpen(true)}
              className="font-mono-ui inline-flex items-center gap-2 border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              title="Change your name"
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden max-w-[140px] truncate sm:inline">{identity.name ?? "Set name"}</span>
            </button>
            <Link
              to="/"
              className="font-mono-ui hidden shrink-0 border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background sm:inline-flex"
            >
              Atelier
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 sm:py-12">
        {project.palette.length > 0 && (
          <section className="mb-10 sm:mb-12">
            <p className="mb-3 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Palette</p>
            <div className="flex flex-wrap gap-2">
              {project.palette.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                  <span className="h-5 w-5 rounded-sm border border-border shadow-sm" style={{ background: c }} />
                  <span className="font-mono-ui hidden text-[10px] uppercase tracking-[0.2em] sm:inline">{c}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {allTags.length > 0 && (
          <section className="mb-6">
            <p className="mb-3 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Filter</p>
            <div className="flex flex-wrap gap-2">
              <TagPill label="All" active={activeTag === "__all"} onClick={() => setActiveTag("__all")} />
              {allTags.map((t) => (
                <TagPill key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} />
              ))}
            </div>
          </section>
        )}

        <p className="mb-4 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Tap a heart to love · Click an image to comment
        </p>

        <div
          key={activeTag}
          className="grid animate-fade-in grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
        >
          {visibleImages.map((img) => {
            const t = tallies.get(img.id) ?? { love: 0, pass: 0, mine: null };
            const commentCount = feedback.filter((f) => f.itemId === img.id).length;
            return (
              <figure key={img.id} className="group flex flex-col gap-2">
                <button
                  onClick={() => setActiveImage(img)}
                  className="relative overflow-hidden rounded-lg border border-border bg-muted/30 text-left shadow-sm transition-shadow hover:shadow-lg"
                >
                  <LazyImage src={img.src} alt={img.caption ?? ""} />
                  {commentCount > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 border border-foreground bg-background/95 px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[0.18em] text-foreground backdrop-blur">
                      <MessageSquare className="h-3 w-3" /> {commentCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ReactionButton
                      kind="love"
                      active={t.mine === "love"}
                      count={t.love}
                      onClick={() => handleReact(img, "love")}
                    />
                    <ReactionButton
                      kind="pass"
                      active={t.mine === "pass"}
                      count={t.pass}
                      onClick={() => handleReact(img, "pass")}
                    />
                  </div>
                  <button
                    onClick={() => setActiveImage(img)}
                    className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                  >
                    Comment
                  </button>
                </div>
              </figure>
            );
          })}
        </div>

        {visibleImages.length === 0 && (
          <p className="py-20 text-center font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {images.length === 0 ? "No images on this board yet." : "No images match this tag."}
          </p>
        )}

        {/* Board-level decision */}
        <BoardDecisionPanel
          existing={boardDecision}
          onSubmit={async (decision, note) => {
            if (!identity.name) {
              setNameOpen(true);
              return false;
            }
            await addComment(null, note, identity, decision);
            return true;
          }}
        />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Shared via Atelier</span>
          <Link to="/" className="hover:text-foreground">Create your own →</Link>
        </div>
      </footer>

      {activeImage && (
        <ImageDetailPanel
          image={activeImage}
          comments={feedback.filter((f) => f.itemId === activeImage.id)}
          identity={identity}
          onClose={() => setActiveImage(null)}
          onComment={async (body) => {
            if (!identity.name) {
              setNameOpen(true);
              return;
            }
            await addComment(activeImage.id, body, identity);
          }}
          onPromptName={() => setNameOpen(true)}
        />
      )}

      {nameOpen && (
        <NameModal
          initial={identity.name ?? ""}
          firstTime={!identity.name}
          onSave={(n) => {
            setName(n);
            setNameOpen(false);
          }}
          onClose={() => identity.name && setNameOpen(false)}
        />
      )}
      {nameEditOpen && (
        <NameModal
          initial={identity.name ?? ""}
          firstTime={false}
          onSave={(n) => {
            setName(n);
            setNameEditOpen(false);
          }}
          onClose={() => setNameEditOpen(false)}
        />
      )}
    </div>
  );
}

/* ----------------------------- Reaction button --------------------------- */

function ReactionButton({
  kind,
  active,
  count,
  onClick,
}: {
  kind: "love" | "pass";
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const Icon = kind === "love" ? Heart : X;
  return (
    <button
      onClick={onClick}
      aria-label={kind === "love" ? "Love this image" : "Pass on this image"}
      className={`group/btn inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? kind === "love"
            ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 transition-transform group-hover/btn:scale-110 ${
          active && kind === "love" ? "fill-current" : ""
        }`}
      />
      {kind === "love" && <span>{count.toString().padStart(2, "0")}</span>}
    </button>
  );
}

/* ----------------------------- Detail panel ------------------------------ */

function ImageDetailPanel({
  image,
  comments,
  identity,
  onClose,
  onComment,
  onPromptName,
}: {
  image: BoardImage;
  comments: ReturnType<typeof useBoardFeedback>["feedback"];
  identity: ClientIdentity;
  onClose: () => void;
  onComment: (body: string) => Promise<void>;
  onPromptName: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim().slice(0, 1000);
    if (!body) return;
    if (!identity.name) {
      onPromptName();
      return;
    }
    setBusy(true);
    await onComment(body);
    setBusy(false);
    setDraft("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-foreground/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl sm:flex-row"
      >
        {/* Image */}
        <div className="relative shrink-0 bg-secondary sm:w-1/2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center border border-foreground bg-background/90 text-foreground backdrop-blur hover:bg-foreground hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
          <img src={image.src} alt={image.caption ?? ""} className="h-full max-h-[60vh] w-full object-cover sm:max-h-full" />
        </div>

        {/* Comments */}
        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">— Discussion</p>
          <h3 className="mt-1 font-display text-2xl">{image.caption ?? "Untitled image"}</h3>

          <div className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                No comments yet. Be the first.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="border-l-2 border-border pl-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm">{c.clientName}</span>
                    <span className="font-mono-ui text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={submit} className="mt-6 border-t border-border pt-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={identity.name ? `Comment as ${identity.name}…` : "Add your name to comment…"}
              className="w-full resize-none border border-border bg-transparent p-3 text-sm outline-none focus:border-foreground"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {draft.length}/1000
              </span>
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-background hover:bg-background hover:text-foreground disabled:opacity-40"
              >
                <Send className="h-3 w-3" /> Send comment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Board decision ----------------------------- */

function BoardDecisionPanel({
  existing,
  onSubmit,
}: {
  existing: { decision: "approve" | "changes" | null; clientName: string; body: string; createdAt: number } | null;
  onSubmit: (decision: "approve" | "changes", note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done || existing) {
    const e = existing;
    return (
      <section className="mt-20 border border-foreground bg-secondary/40 px-8 py-10 text-center">
        <Check className="mx-auto h-7 w-7" strokeWidth={1.5} />
        <h3 className="mt-3 font-display text-3xl">Your feedback has been sent.</h3>
        {e && (
          <p className="mt-2 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {e.decision === "approve" ? "Approved" : "Changes requested"} by {e.clientName} · {relativeTime(e.createdAt)}
          </p>
        )}
        {e?.body && <p className="mx-auto mt-4 max-w-lg whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>}
      </section>
    );
  }

  const send = async (decision: "approve" | "changes") => {
    setBusy(true);
    const ok = await onSubmit(decision, note.trim().slice(0, 2000));
    setBusy(false);
    if (ok) setDone(true);
  };

  return (
    <section className="mt-20 border border-border px-8 py-10">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">— Final word</p>
      <h3 className="mt-2 font-display text-3xl">Tell the designer where this lands.</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Leave an optional overall note, then approve or request changes. The designer will be notified.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Overall thoughts on the direction…"
        className="mt-6 w-full resize-none border border-border bg-transparent p-3 text-sm outline-none focus:border-foreground"
      />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => send("approve")}
          disabled={busy}
          className="font-mono-ui group inline-flex w-full items-center justify-between border border-foreground bg-foreground px-5 py-3.5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-background hover:text-foreground disabled:opacity-50 sm:flex-1"
        >
          <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Approve this board</span>
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </button>
        <button
          onClick={() => send("changes")}
          disabled={busy}
          className="font-mono-ui inline-flex w-full items-center justify-center gap-2 border border-border px-5 py-3.5 text-[11px] uppercase tracking-[0.22em] text-foreground hover:bg-secondary disabled:opacity-50 sm:flex-1"
        >
          Request changes
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ Name modal ------------------------------ */

function NameModal({
  initial,
  firstTime,
  onSave,
  onClose,
}: {
  initial: string;
  firstTime: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim().slice(0, 60);
    if (!v) return;
    onSave(v);
  };
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md border border-border bg-background p-8 shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-5">
          {["#0f0f0f", "#d4a574", "#4a7a8c", "#8b4a5c", "#f5f0e6"].map((c) => (
            <div key={c} style={{ backgroundColor: c }} />
          ))}
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          — {firstTime ? "Welcome" : "Update name"}
        </p>
        <h2 className="mt-3 font-display text-3xl leading-tight">
          {firstTime ? (
            <>Add your name so the designer<br />knows whose feedback this is.</>
          ) : (
            <>Change how your feedback is signed.</>
          )}
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Marisol Chen"
          className="mt-6 w-full border-0 border-b border-border bg-transparent pb-2.5 font-display text-2xl outline-none placeholder:text-muted-foreground focus:border-foreground"
        />
        <p className="font-mono-ui mt-3 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          Stored only in this browser
        </p>
        <div className="mt-8 flex items-center justify-end gap-3">
          {!firstTime && (
            <button
              type="button"
              onClick={onClose}
              className="font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!name.trim()}
            className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {firstTime ? "Enter the board" : "Save"}
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}