import { createContext } from "react";
import type { PortalConfig } from "../types";

export interface ConfigContextValue {
  config: PortalConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);
