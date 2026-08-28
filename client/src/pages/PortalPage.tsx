import { Sidebar } from "../components/Sidebar";
import { GrafanaPanelStub } from "../components/GrafanaPanelStub";
import { Boxes, ChartNoAxesCombined, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConfig } from "../hooks/useConfig";

export function PortalPage() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const categoryCount = config?.categories.length ?? 0;
  const serviceCount = config?.categories.reduce((total, category) => total + category.apps.length, 0) ?? 0;

  return (
    <div className="portal-layout">
      <Sidebar />
      <div className="portal-workspace">
        <header className="portal-header">
          <div className="portal-header-copy">
            <span className="portal-eyebrow">{t("portal.overview")}</span>
            <h1>{t("portal.welcome")}</h1>
            <p>{t("portal.description")}</p>
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
