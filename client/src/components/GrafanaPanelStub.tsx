import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConfig } from "../hooks/useConfig";
import type { GrafanaSettings } from "../types";

export function GrafanaPanelStub() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const [loaded, setLoaded] = useState(false);
  const settings = config?.settings.grafana;

  if (!settings?.enabled || !settings.url) {
    return (
      <section className="grafana-panel grafana-panel-empty">
        <p>{t("dashboard.grafanaDisabled")}</p>
      </section>
    );
  }

  const dashboardUrl = buildGrafanaUrl(settings);

  return (
    <section className="grafana-panel">
      <div className="grafana-frame-wrapper">
        <a
          className="grafana-open-button btn"
          href={dashboardUrl}
          target="_blank"
          rel="noreferrer"
          title={t("dashboard.openInGrafana")}
          aria-label={t("dashboard.openInGrafana")}
        >
          <ExternalLink className="grafana-open-icon" aria-hidden="true" size={20} strokeWidth={2.5} />
        </a>
        {!loaded && <div className="grafana-frame-loading">{t("dashboard.loading")}</div>}
        <iframe
          title={t("dashboard.title")}
          src={dashboardUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <p className="grafana-panel-hint">{t("dashboard.loginHint")}</p>
    </section>
  );
}

function buildGrafanaUrl(settings: GrafanaSettings): string {
  const url = new URL(settings.url);
  const hasDashboardPath = /\/d(?:-solo)?\//.test(url.pathname);

  if (settings.dashboardUid && !hasDashboardPath) {
    const basePath = url.pathname.replace(/\/$/, "");
    url.pathname = `${basePath}/d/${encodeURIComponent(settings.dashboardUid)}/${encodeURIComponent(settings.dashboardSlug)}`;
  }

  url.searchParams.set("from", settings.timeRange);
  url.searchParams.set("to", "now");
  if (settings.refreshInterval) {
    url.searchParams.set("refresh", settings.refreshInterval);
  } else {
    url.searchParams.delete("refresh");
  }
  url.searchParams.set("kiosk", "1");
  return url.toString();
}
