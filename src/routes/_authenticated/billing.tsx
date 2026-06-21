import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useIsPro } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Atelier" },
      { name: "description", content: "Manage your Atelier subscription." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { isPro, loaded, subscription } = useIsPro();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const openPortal = async () => {
    setOpening(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/billing` },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Could not open billing portal. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-8 py-5">
          <Link to="/" className="font-mono-ui inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to boards
          </Link>
          <span className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Billing</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-8 py-16">
        {subscription?.cancel_at_period_end && subscription.current_period_end && (
          <div className="mb-8 border border-amber-500/40 bg-amber-500/10 p-4 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-amber-900 dark:text-amber-200">
            Pro ends on{" "}
            {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
            . You'll keep access until then.
          </div>
        )}
        <div className="animate-fade-in">
          <p className="font-mono-ui mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Account</p>
          <h1 className="font-display text-5xl leading-[0.95]">Your plan.</h1>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free / Starter */}
          <div
            className={`group relative overflow-hidden border bg-background p-8 transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] animate-fade-in ${
              !isPro ? "border-foreground" : "border-border hover:border-foreground/60"
            }`}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Free</p>
            <h2 className="mt-2 font-display text-3xl">Starter</h2>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>— Up to 3 boards</li>
              <li>— 1 active share link</li>
              <li>— "Made with Atelier" badge on shares</li>
            </ul>
            {!isPro && loaded && (
              <p className="font-mono-ui mt-8 text-[10px] uppercase tracking-[0.2em]">Current plan</p>
            )}
          </div>

          {/* Pro */}
          <div
            className={`group relative overflow-hidden border bg-background p-8 transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_24px_60px_-30px_oklch(0.55_0.20_255_/_0.45)] animate-fade-in [animation-delay:80ms] ${
              isPro ? "border-foreground" : "border-border hover:border-[oklch(0.55_0.20_255)]"
            }`}
          >
            {/* Animated sheen */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[oklch(0.70_0.16_255)]/15 to-transparent opacity-0 transition-all duration-[1100ms] ease-out group-hover:left-[120%] group-hover:opacity-100"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.62_0.18_255)] to-transparent"
            />
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-[oklch(0.52_0.18_255)]">Pro</p>
            <h2 className="mt-2 font-display text-3xl">Atelier Pro</h2>
            <p className="mt-1 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">$12 / month</p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>— Unlimited boards</li>
              <li>— Unlimited active share links</li>
              <li>— No badge on shares</li>
            </ul>
            <div className="mt-8">
              {!loaded ? (
                <span className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Loading…</span>
              ) : isPro ? (
                <button
                  onClick={openPortal}
                  disabled={opening}
                  className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background transition-all duration-200 ease-out hover:bg-background hover:text-foreground motion-safe:hover:-translate-y-px disabled:opacity-50"
                >
                  {opening ? "Opening…" : "Manage subscription"}
                </button>
              ) : (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="font-mono-ui inline-flex items-center gap-2 border border-[oklch(0.52_0.18_255)] bg-[oklch(0.52_0.18_255)] px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background transition-all duration-200 ease-out hover:bg-background hover:text-[oklch(0.42_0.20_260)] motion-safe:hover:-translate-y-px"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}