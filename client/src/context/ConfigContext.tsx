import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import i18n from "../i18n";
import { api } from "../api";
import type { PortalConfig } from "../types";
import { ConfigContext } from "./config-context";

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getConfig();
      setConfig(data);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konfiguration konnte nicht geladen werden.");
      throw reason;
    }
  }, []);

  useEffect(() => {
    // Async initial data loading is the external synchronization performed by this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh().catch(() => undefined).finally(() => setLoading(false));
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
    <ConfigContext.Provider value={{ config, loading, error, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}
