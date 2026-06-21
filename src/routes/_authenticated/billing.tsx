import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
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
  const { isPro, loaded } = useIsPro();
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
        <p className="font-mono-ui mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">— Account</p>
        <h1 className="font-display text-5xl leading-[0.95]">Your plan.</h1>

        <div className="mt-12 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
          <div className={`bg-background p-8 ${!isPro ? "ring-2 ring-foreground" : ""}`}>
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

          <div className={`bg-background p-8 ${isPro ? "ring-2 ring-foreground" : ""}`}>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" /> Pro
            </p>
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
                  className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground disabled:opacity-50"
                >
                  {opening ? "Opening…" : "Manage subscription"}
                </button>
              ) : (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
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