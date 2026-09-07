import { useState } from "react";
import {
  MonitorUp,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildDashboardUrl, resolveDashboardSettings } from "../dashboard";
import { useConfig } from "../hooks/useConfig";
import { DevicePortalView } from "../devices/DevicePortalView";

interface DashboardPanelProps {
  search?: string;
  reloadKey?: number;
}

export function DashboardPanel({ search = "", reloadKey = 0 }: DashboardPanelProps) {
  const { t } = useTranslation();
  const { config, theme } = useConfig();
  const [loaded, setLoaded] = useState(false);
  const settings = resolveDashboardSettings(config?.settings);

  if (!settings.enabled) {
    return (
      <section className="dashboard-panel dashboard-panel-empty">
        <span className="dashboard-empty-icon"><MonitorUp size={28} aria-hidden="true" /></span>
        <h2>{t("dashboard.emptyTitle")}</h2>
        <p>{t("dashboard.emptyDescription")}</p>
      </section>
    );
  }

  const title = settings.title || t(`admin.dashboardProviders.${settings.provider}.title`);

  if (settings.provider === "devices") {
    return (
      <section className="dashboard-panel dashboard-panel-native">
        <div className="dashboard-native-content">
          <DevicePortalView key={reloadKey} search={search} />
        </div>
      </section>
    );
  }

  let dashboardUrl = "";
  if (settings.url) {
    try {
      dashboardUrl = buildDashboardUrl(settings, theme);
    } catch {
      dashboardUrl = "";
    }
  }

  if (!dashboardUrl) {
    return (
      <section className="dashboard-panel dashboard-panel-empty">
        <span className="dashboard-empty-icon"><MonitorUp size={28} aria-hidden="true" /></span>
        <h2>{t("dashboard.emptyTitle")}</h2>
        <p>{t("dashboard.emptyDescription")}</p>
      </section>
    );
  }

  return (
    <section className="dashboard-panel">
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
