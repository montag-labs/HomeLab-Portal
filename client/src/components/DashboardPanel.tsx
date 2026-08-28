import { useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  ExternalLink,
  HeartPulse,
  MonitorUp,
  PanelsTopLeft,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildDashboardUrl, resolveDashboardSettings } from "../dashboard";
import { useConfig } from "../hooks/useConfig";
import type { DashboardProvider } from "../types";

function ProviderIcon({ provider, size = 18 }: { provider: DashboardProvider; size?: number }) {
  if (provider === "grafana") return <ChartNoAxesCombined size={size} />;
  if (provider === "netdata") return <Activity size={size} />;
  if (provider === "uptime-kuma") return <HeartPulse size={size} />;
  return <PanelsTopLeft size={size} />;
}

export function DashboardPanel() {
  const { t } = useTranslation();
  const { config, theme } = useConfig();
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const settings = resolveDashboardSettings(config?.settings);

  let dashboardUrl = "";
  if (settings.url) {
    try {
      dashboardUrl = buildDashboardUrl(settings, theme);
    } catch {
      dashboardUrl = "";
    }
  }

  if (!settings.enabled || !dashboardUrl) {
    return (
      <section className="dashboard-panel dashboard-panel-empty">
        <span className="dashboard-empty-icon"><MonitorUp size={28} aria-hidden="true" /></span>
        <h2>{t("dashboard.emptyTitle")}</h2>
        <p>{t("dashboard.emptyDescription")}</p>
      </section>
    );
  }

  const title = settings.title || t(`admin.dashboardProviders.${settings.provider}.title`);

  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel-toolbar">
        <div className="dashboard-panel-identity">
          <span><ProviderIcon provider={settings.provider} /></span>
          <div>
            <strong>{title}</strong>
            <small>{t(`admin.dashboardProviders.${settings.provider}.title`)}</small>
          </div>
        </div>
        <div className="dashboard-panel-actions">
          <button
            type="button"
            onClick={() => {
              setLoaded(false);
              setReloadKey((current) => current + 1);
            }}
            title={t("dashboard.reload")}
            aria-label={t("dashboard.reload")}
          >
            <RefreshCw size={17} />
          </button>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            title={t("dashboard.openExternal")}
            aria-label={t("dashboard.openExternal")}
          >
            <ExternalLink size={17} />
          </a>
        </div>
      </header>
      <div className="dashboard-frame-wrapper">
        {!loaded && (
          <div className="dashboard-frame-loading">
            <RefreshCw size={20} />
            <span>{t("dashboard.loadingProvider", { provider: title })}</span>
          </div>
        )}
        <iframe
          key={`${dashboardUrl}-${reloadKey}`}
          title={title}
          src={dashboardUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <p className="dashboard-panel-hint">{t("dashboard.embedHint")}</p>
    </section>
  );
}
