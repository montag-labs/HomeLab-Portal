import { createContext } from "react";
import type { PortalConfig } from "../types";

import type { ThemeMode } from '../types';

export interface ConfigContextValue {
  config: PortalConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);
