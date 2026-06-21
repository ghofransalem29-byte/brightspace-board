import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";

export function WelcomeProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border border-border bg-background p-10 text-center"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-background"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Welcome to</p>
        <h2 className="font-display text-4xl leading-tight">Atelier Pro.</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          All boards are unlocked. Share without limits — your work, your way.
        </p>
        <button
          onClick={onClose}
          className="font-mono-ui mt-8 inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
        >
          Begin curating
        </button>
      </div>
    </div>
  );
}