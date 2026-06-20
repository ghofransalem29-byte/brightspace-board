import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, ArrowUpRight, LogOut } from "lucide-react";
import { useState } from "react";
import { useProjects, type Project } from "@/lib/projects";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Atelier — Mood Boards & Visual Curation" },
      { name: "description", content: "A quiet, deliberate workspace for visual research and mood board curation." },
    ],
  }),
  component: Dashboard,
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Dashboard() {
  const { projects, loaded, create } = useProjects();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const project = await create(title);
    setBusy(false);
    if (!project) return;
    setCreating(false);
    setTitle("");
    navigate({ to: "/project/$id", params: { id: project.id } });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none">Atelier</span>
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              v.01 / Visual Curator
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono-ui text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              {projects.length.toString().padStart(2, "0")} Boards
            </span>
            <ThemeToggle />
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-background"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-8 py-16">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8">
              <p className="font-mono-ui mb-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                — Index / Boards
              </p>
              <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.95]">
                A quiet place
                <br />
                to <em className="italic">collect</em> what
                <br />
                catches the eye.
              </h1>
            </div>
            <div className="col-span-12 flex flex-col justify-end lg:col-span-4">
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Curate visual research, distill palettes, and let ideas find each other on an infinite canvas. No noise. No clutter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1400px] px-8 py-12">
          <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
            <h2 className="font-mono-ui text-[11px] uppercase tracking-[0.2em]">Your Boards</h2>
            <span className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Last updated · {loaded && projects[0] ? formatDate(projects[0].createdAt) : "—"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 border border-border">
            <button
              onClick={() => setCreating(true)}
              className="group relative flex aspect-[4/5] flex-col justify-between bg-background p-6 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em]">New · 00</span>
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-display text-3xl leading-tight">Begin a new board.</p>
                <p className="mt-2 text-xs opacity-70">Start with a blank canvas.</p>
              </div>
            </button>

            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i + 1} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>© Atelier Studio</span>
          <span>Curated in the cloud · {new Date().getFullYear()}</span>
        </div>
      </footer>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setCreating(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md border border-border bg-background p-8"
          >
            <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New Board</p>
            <h3 className="font-display text-3xl">Name your board.</h3>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Winter editorial"
              className="mt-6 w-full border-0 border-b border-border bg-transparent pb-3 font-display text-2xl outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="font-mono-ui px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"} <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const palette = project.palette.length > 0 ? project.palette : ["#1a1a1a", "#3a3a3a", "#7a7a7a", "#d4d4d4"];
  return (
    <Link
      to="/project/$id"
      params={{ id: project.id }}
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden bg-background p-6 transition-colors hover:bg-secondary"
    >
      <div
        className="absolute inset-x-6 top-6 h-1/2"
        style={{
          background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1] ?? palette[0]} 40%, ${palette[2] ?? palette[0]} 75%, ${palette[3] ?? palette[0]} 100%)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-background mix-blend-difference">
          № {index.toString().padStart(3, "0")}
        </span>
        <ArrowUpRight
          className="h-5 w-5 text-background mix-blend-difference transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={1.5}
        />
      </div>
      <div className="relative">
        <div className="mb-3 flex gap-1">
          {project.palette.map((c) => (
            <span
              key={c}
              className="h-3 w-3 border border-border"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <h3 className="font-display text-3xl leading-tight">{project.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
        <div className="mt-4 flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{(project.imageCount ?? 0).toString().padStart(2, "0")} images</span>
          <span>{formatDate(project.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}