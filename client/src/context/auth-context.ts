import { createContext } from "react";
import type { AuthSession } from "../types";

export interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
