// src/UserContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supa";

const UserCtx = createContext({ user:null, userType:null, loading:true });

export function UserProvider({ children }) {
  const [state, setState] = useState({ user:null, userType:null, loading:true });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setState({ user:null, userType:null, loading:false });

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      setState({ user, userType: profile?.user_type ?? null, loading:false });
    })();

    // live update po zmianie sesji
    const { data: sub } = supabase.auth.onAuthStateChange(() => location.reload());
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return <UserCtx.Provider value={state}>{children}</UserCtx.Provider>;
}

export const useUser = () => useContext(UserCtx);
