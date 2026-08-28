import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { GrafanaPanelStub } from "../components/GrafanaPanelStub";
import { Boxes, ChartNoAxesCombined, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { BrandLogo } from "../components/BrandLogo";
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
          <div className="portal-header-brand">
            <BrandLogo
              version={updateStatus?.installedVersion ?? "-"}
              status={versionStatus}
              statusState={versionState}
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
          </div>
        </header>
        <main className="portal-main">
          <section className="portal-dashboard-section">
            <div className="portal-section-heading">
              <span className="portal-section-icon">
                <ChartNoAxesCombined size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>{t("dashboard.title")}</h2>
                <p>{t("portal.dashboardDescription")}</p>
              </div>
            </div>
            <GrafanaPanelStub />
          </section>
        </main>
      </div>
    </div>
  );
}
