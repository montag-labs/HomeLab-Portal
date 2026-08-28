import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { DashboardPanel } from "../components/DashboardPanel";
import { ThemeToggle } from "../components/ThemeToggle";
import { BrandIdentity } from "../components/BrandIdentity";
import { Boxes, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useConfig } from "../hooks/useConfig";
import type { UpdateStatus } from "../types";

export function PortalPage() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const categoryCount = config?.categories.length ?? 0;
  const serviceCount = config?.categories.reduce((total, category) => total + category.apps.length, 0) ?? 0;
  const versionState = updateStatus?.updateAvailable ? "available" : updateStatus?.state ?? "loading";
  const versionStatus = updateStatus
    ? t(`app.versionStates.${versionState}`)
    : t("app.versionStates.loading");

  useEffect(() => {
    api.getUpdateStatus().then(setUpdateStatus).catch(() => setUpdateStatus(null));
  }, []);

  return (
    <div className="portal-layout">
      <Sidebar />
      <div className="portal-workspace">
        <header className="portal-header">
          <div className="portal-brand-card">
            <BrandIdentity
              details={(
                <span className={`portal-brand-status portal-brand-status-${versionState}`}>
                v{updateStatus?.installedVersion ?? "-"} · {versionStatus}
                </span>
              )}
            />
          </div>
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
          </div>
        </header>
        <main className="portal-main">
          <DashboardPanel />
        </main>
      </div>
    </div>
  );
}
