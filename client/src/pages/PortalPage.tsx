import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { DashboardPanel } from "../components/DashboardPanel";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProviderIcon } from "../components/ProviderIcon";
import { Boxes, ExternalLink, RefreshCw, Search, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useConfig } from "../hooks/useConfig";
import { buildDashboardUrl, resolveDashboardSettings } from "../dashboard";
import type { UpdateStatus } from "../types";
import { ReachabilityProvider } from "../context/ReachabilityProvider";

export function PortalPage() {
  const { t } = useTranslation();
  const { config, theme } = useConfig();
  const [reloadKey, setReloadKey] = useState(0);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  const categoryCount = config?.categories.length ?? 0;
  const serviceCount = config?.categories.reduce((total, category) => total + category.apps.length, 0) ?? 0;

  useEffect(() => {
    api.getUpdateStatus().then(setUpdateStatus).catch(() => setUpdateStatus(null));
  }, []);

  const settings = resolveDashboardSettings(config?.settings);
  const dashboardTitle = settings.enabled
    ? (settings.title || t(`admin.dashboardProviders.${settings.provider}.title`))
    : t("portal.overview");

  let externalDashboardUrl = "";
  if (settings.enabled && settings.provider !== "devices" && settings.url) {
    try {
      externalDashboardUrl = buildDashboardUrl(settings, theme);
    } catch {
      externalDashboardUrl = "";
    }
  }

  return (
    <ReachabilityProvider>
      <div className="portal-layout">
        <Sidebar updateStatus={updateStatus} />
        <div className="portal-workspace">
          <header className="portal-header">
            <div className="portal-dashboard-title-card">
              <span className="portal-dashboard-icon">
                {settings.enabled ? (
                  <ProviderIcon provider={settings.provider} size={20} />
                ) : (
                  <Boxes size={20} />
                )}
              </span>
              <span className="portal-dashboard-name">{dashboardTitle}</span>
              {externalDashboardUrl && (
                <a
                  href={externalDashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-external-dashboard-link"
                  title={t("dashboard.openExternal")}
                  aria-label={t("dashboard.openExternal")}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            {settings.enabled && settings.provider === "devices" && (
              <div className="portal-header-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t("devices.search")}
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  aria-label={t("devices.search")}
                />
              </div>
            )}

            <div className="portal-summary" aria-label={t("portal.summary")}>
              <div className="portal-summary-item">
                <span className="portal-summary-icon"><Boxes size={18} aria-hidden="true" /></span>
                <span><strong>{categoryCount}</strong>{t("portal.categories")}</span>
              </div>
              <div className="portal-summary-item">
                <span className="portal-summary-icon"><Server size={18} aria-hidden="true" /></span>
                <span><strong>{serviceCount}</strong>{t("portal.services")}</span>
              </div>
              <ThemeToggle />
              {settings.enabled && (
                <button
                  type="button"
                  className="theme-toggle-tile portal-reload-tile"
                  onClick={() => setReloadKey((k) => k + 1)}
                  title={t("dashboard.reload")}
                  aria-label={t("dashboard.reload")}
                >
                  <span className="theme-toggle-icon"><RefreshCw size={18} aria-hidden="true" /></span>
                  <span>
                    <strong>{t("dashboard.title")}</strong>
                    <small>{t("admin.logRefresh")}</small>
                  </span>
                </button>
              )}
            </div>
          </header>
          <main className="portal-main">
            <DashboardPanel search={deviceSearch} reloadKey={reloadKey} />
          </main>
        </div>
      </div>
    </ReachabilityProvider>
  );
}
