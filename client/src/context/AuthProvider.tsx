import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { AuthSession } from "../types";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getAuthSession().then(setSession).finally(() => setLoading(false));
  }, []);
  const login = useCallback(async (password: string) => setSession(await api.login(password)), []);
  const logout = useCallback(async () => {
    await api.logout();
    setSession((current) => current ? { ...current, authenticated: false, csrfToken: undefined } : current);
  }, []);
  return <AuthContext.Provider value={{ session, loading, login, logout }}>{children}</AuthContext.Provider>;
}
