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
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-mono-ui mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Atelier · v.01
          </p>
          <h1 className="font-display text-5xl leading-[0.95]">
            {mode === "signin" ? "Welcome back." : "Create your studio."}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your private mood boards."
              : "Start curating private visual research."}
          </p>
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="font-mono-ui mb-6 inline-flex w-full items-center justify-center gap-3 border border-foreground bg-background px-4 py-3 text-[11px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="mb-6 flex items-center gap-3 font-mono-ui text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            className="w-full border-0 border-b border-border bg-transparent pb-3 font-display text-xl outline-none placeholder:text-muted-foreground focus:border-foreground"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border-0 border-b border-border bg-transparent pb-3 font-display text-xl outline-none placeholder:text-muted-foreground focus:border-foreground"
          />

          {error && (
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="font-mono-ui inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="font-mono-ui mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {mode === "signin" ? "No account yet?" : "Have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="text-foreground underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}