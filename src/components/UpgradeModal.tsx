import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function UpgradeModal({ open, onClose, title, message }: UpgradeModalProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!open) return null;

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId: "pro_monthly",
        returnUrl: `${window.location.origin}/?checkout=success`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden border border-border bg-background"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-background"
        >
          <X className="h-4 w-4" />
        </button>

        {!checkoutOpen ? (
          <div className="p-10">
            <p className="font-mono-ui mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Atelier Pro
            </p>
            <h2 className="font-display text-4xl leading-tight">
              {title ?? "Unlock the studio."}
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              {message ??
                "You've reached the limits of the free tier."}
            </p>

            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-muted-foreground">—</span> Unlimited boards</li>
              <li className="flex items-start gap-2"><span className="text-muted-foreground">—</span> Unlimited active share links</li>
              <li className="flex items-start gap-2"><span className="text-muted-foreground">—</span> No "Made with Atelier" badge on shares</li>
            </ul>

            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <div>
                <span className="font-display text-3xl">$12</span>
                <span className="ml-1 font-mono-ui text-[11px] uppercase tracking-[0.2em] text-muted-foreground">/ month</span>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="font-mono-ui inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-background hover:text-foreground"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[85vh] overflow-y-auto">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}