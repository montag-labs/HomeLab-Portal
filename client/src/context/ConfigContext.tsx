import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import i18n from "../i18n";
import { api } from "../api";
import type { PortalConfig } from "../types";

interface ConfigContextValue {
  config: PortalConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.getConfig();
    setConfig(data);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!config) return;
    document.documentElement.dataset.theme = config.settings.theme;
    document.documentElement.style.setProperty(
      "--accent-color",
      config.settings.accentColor
    );
    i18n.changeLanguage(config.settings.language);
  }, [config]);

  return (
    <ConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
