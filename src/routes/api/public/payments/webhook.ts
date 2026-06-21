import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function priceLookup(price: any): string {
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || "";
}

async function upsertSubscription(sub: any, env: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const priceId = priceLookup(item?.price);
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      product_id: productId,
      price_id: priceId,
      status: sub.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function markDeleted(sub: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await markDeleted(event.data.object, env);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});