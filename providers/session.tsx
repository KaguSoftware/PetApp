import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SessionState {
  session: Session | null;
  /** False until the persisted session (if any) has been read from AsyncStorage. */
  ready: boolean;
}

const Ctx = createContext<SessionState>({ session: null, ready: false });

/**
 * Auth-session source of truth for routing. The StoreProvider keeps its own
 * onAuthStateChange subscription for data hydration; this one only drives
 * which route group ((auth) vs (tabs)) is allowed to render.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, ready: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, ready: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, ready: true });
    });
    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
