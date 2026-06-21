import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_id: string | null;
}

export function useIsPro() {
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [sub, setSub] = useState<SubscriptionRow | null>(null);

  const refresh = useCallback(async () => {
    if (!isPaymentsConfigured()) {
      setIsPro(false);
      setSub(null);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setIsPro(false);
      setSub(null);
      return;
    }
    const env = getStripeEnvironment();
    const [proRes, rowRes] = await Promise.all([
      supabase.rpc("is_user_pro", { _user_id: u.user.id, _env: env }),
      supabase
        .from("subscriptions")
        .select("status,current_period_end,cancel_at_period_end,price_id")
        .eq("user_id", u.user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (proRes.error) {
      console.error(proRes.error);
      setIsPro(false);
    } else {
      setIsPro(!!proRes.data);
    }
    setSub((rowRes.data as SubscriptionRow | null) ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isPro: isPro ?? false, loaded: isPro !== null, subscription: sub, refresh };
}