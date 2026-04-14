"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "user" | "staff" | "admin";

interface CreditsContextType {
  credits: number | null;
  role: UserRole | null;
  isStaff: boolean;          // staff or admin — bypasses credit gate
  referralCode: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: null,
  role: null,
  isStaff: false,
  referralCode: null,
  loading: true,
  refresh: async () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits]           = useState<number | null>(null);
  const [role, setRole]                 = useState<UserRole | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCredits(null); setRole(null); setReferralCode(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("credits, role, referral_code")
      .eq("id", user.id)
      .single();
    setCredits(data?.credits ?? null);
    setRole((data?.role as UserRole) ?? "user");

    // Auto-generate referral code if user doesn't have one
    let code = data?.referral_code ?? null;
    if (!code && user) {
      code = user.id.replace(/-/g, "").slice(0, 8).toLowerCase();
      await supabase.from("profiles").update({ referral_code: code }).eq("id", user.id);
    }
    setReferralCode(code);

    // Resolve referred_by_code → referred_by user ID (only on first load if not yet set)
    const profileData = data as Record<string, unknown> | null;
    const alreadyHasReferredBy = profileData?.referred_by != null;
    const metaRefCode = (user?.user_metadata?.referred_by_code as string | undefined) ?? null;
    if (!alreadyHasReferredBy && metaRefCode && user) {
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", metaRefCode.toLowerCase())
        .maybeSingle();
      if (referrerProfile && referrerProfile.id !== user.id) {
        await supabase
          .from("profiles")
          .update({ referred_by: referrerProfile.id })
          .eq("id", user.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const r = role ?? "user";
  const isStaff = r === "staff" || r === "admin";

  return (
    <CreditsContext.Provider value={{ credits, role, isStaff, referralCode, loading, refresh }}>
      {children}
    </CreditsContext.Provider>
  );
}

export const useCredits = () => useContext(CreditsContext);
