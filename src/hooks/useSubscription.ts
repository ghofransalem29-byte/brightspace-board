import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export function useIsPro() {
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!isPaymentsConfigured()) {
      setIsPro(false);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setIsPro(false);
      return;
    }
    const env = getStripeEnvironment();
    const { data, error } = await supabase.rpc("is_user_pro", {
      _user_id: u.user.id,
      _env: env,
    });
    if (error) {
      console.error(error);
      setIsPro(false);
    } else {
      setIsPro(!!data);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isPro: isPro ?? false, loaded: isPro !== null, refresh };
}