import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Atelier" },
      { name: "description", content: "Sign in to your private mood boards." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="dark min-h-screen bg-[#0e0e0e] text-[#f4f0e6]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Left — editorial panel */}
        <aside className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:p-12">
          {/* Atmospheric layered swatches */}
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#d4a574] mix-blend-screen blur-3xl opacity-20" />
            <div className="absolute bottom-[-120px] right-[-80px] h-[520px] w-[520px] rounded-full bg-[#4a7a8c] mix-blend-screen blur-3xl opacity-25" />
            <div className="absolute left-1/3 top-1/2 h-[260px] w-[260px] rounded-full bg-[#8b4a5c] mix-blend-screen blur-3xl opacity-20" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-white/60">
              Atelier · v.01
            </p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-white/40">
              MMXXVI
            </p>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="font-mono-ui mb-5 text-[10px] uppercase tracking-[0.3em] text-white/50">
              — Private Studio
            </p>
            <h2 className="font-display text-[clamp(2.75rem,5vw,4.25rem)] leading-[0.95] tracking-tight">
              A quiet room for{" "}
              <em className="italic text-[#d4a574]">visual</em> research.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Curate palettes, references and textures into editorial mood boards.
              Everything you upload stays tied to your account — yours alone, until you choose to share.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-6 gap-px overflow-hidden border border-white/10">
            {["#0f0f0f", "#2a2a2a", "#d4a574", "#4a7a8c", "#8b4a5c", "#f5f0e6"].map((c) => (
              <div key={c} className="aspect-square" style={{ backgroundColor: c }} />
            ))}
          </div>
        </aside>

        {/* Right — form */}
        <section className="flex items-center justify-center px-6 py-16 sm:px-12">
          <div className="w-full max-w-sm">
            <p className="font-mono-ui mb-4 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:hidden">
              Atelier · v.01
            </p>
            <p className="font-mono-ui mb-3 text-[10px] uppercase tracking-[0.3em] text-white/50">
              {mode === "signin" ? "— Sign in" : "— New account"}
            </p>
            <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[0.95] tracking-tight">
              {mode === "signin" ? (
                <>
                  Welcome <em className="italic text-[#d4a574]">back</em>.
                </>
              ) : (
                <>
                  Create your <em className="italic text-[#d4a574]">studio</em>.
                </>
              )}
            </h1>
            <p className="mt-3 text-sm text-white/60">
              {mode === "signin"
                ? "Open the door to your private mood boards."
                : "Start a private space for visual research."}
            </p>

            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="font-mono-ui mt-10 inline-flex w-full items-center justify-center gap-3 border border-white/30 bg-transparent px-4 py-3.5 text-[11px] uppercase tracking-[0.22em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#0e0e0e] disabled:opacity-50"
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            <div className="my-7 flex items-center gap-4 font-mono-ui text-[9px] uppercase tracking-[0.3em] text-white/40">
              <span className="h-px flex-1 bg-white/15" />
              or email
              <span className="h-px flex-1 bg-white/15" />
            </div>

            <form onSubmit={submit} className="space-y-6">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@studio.com"
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
              />

              {error && (
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#ff8585]">
                  {error}
                </p>
              )}
              {info && (
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#d4a574]">
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="font-mono-ui group inline-flex w-full items-center justify-between border border-[#f4f0e6] bg-[#f4f0e6] px-5 py-3.5 text-[11px] uppercase tracking-[0.22em] text-[#0e0e0e] transition-colors hover:bg-transparent hover:text-[#f4f0e6] disabled:opacity-50"
              >
                <span>{busy ? "Opening…" : mode === "signin" ? "Sign in" : "Create account"}</span>
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </form>

            <p className="font-mono-ui mt-10 text-[10px] uppercase tracking-[0.22em] text-white/50">
              {mode === "signin" ? "No account yet?" : "Have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setInfo(null);
                }}
                className="text-[#f4f0e6] underline underline-offset-4 hover:text-[#d4a574]"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>

          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="font-mono-ui mb-2 block text-[10px] uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        className="w-full border-0 border-b border-white/20 bg-transparent pb-2.5 font-display text-2xl text-[#f4f0e6] outline-none transition-colors placeholder:text-white/25 focus:border-[#f4f0e6]"
      />
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c11 0 19.5-8 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.4-4.5 2.3-7.1 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.1 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5.2c-.4.4 6.8-5 6.8-14.9 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}