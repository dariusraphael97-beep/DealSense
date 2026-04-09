"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  const supabase = createClient();

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log("[credits] auth user:", user?.id, user?.email, "error:", authErr?.message);
    if (!user) { setCredits(null); setRole(null); setReferralCode(null); setLoading(false); return; }
    const { data, error: profileErr } = await supabase
      .from("profiles")
      .select("credits, role, referral_code")
      .eq("id", user.id)
      .single();
    console.log("[credits] profile:", data, "error:", profileErr?.message);
    setCredits(data?.credits ?? null);
    setRole((data?.role as UserRole) ?? "user");
    setReferralCode(data?.referral_code ?? null);
    setLoading(false);
  }, [supabase]);

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
