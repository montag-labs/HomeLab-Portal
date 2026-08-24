import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { GeneralSettings } from "./admin/GeneralSettings";
import { CategoryManager } from "./admin/CategoryManager";
import { Dashboard } from "./admin/Dashboard";
import { Updates } from "./admin/Updates";
import { DevDebug } from "./admin/DevDebug";

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"general" | "categories" | "dashboard" | "updates" | "dev">("general");
  const [devEnabled, setDevEnabled] = useState(false);

  useEffect(() => {
    api.getDevAvailability().then((result) => setDevEnabled(result.enabled)).catch(() => setDevEnabled(false));
  }, []);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <Link to="/">{t("nav.portal")}</Link>
        <div className="admin-tabs">
          <button
            type="button"
            className={tab === "general" ? "active" : ""}
            onClick={() => setTab("general")}
          >
            {t("admin.general")}
          </button>
          <button
            type="button"
            className={tab === "categories" ? "active" : ""}
            onClick={() => setTab("categories")}
          >
            {t("admin.categories")}
          </button>
          <button
            type="button"
            className={tab === "dashboard" ? "active" : ""}
            onClick={() => setTab("dashboard")}
          >
            {t("admin.dashboard")}
          </button>
          <button
            type="button"
            className={tab === "updates" ? "active" : ""}
            onClick={() => setTab("updates")}
          >
            {t("admin.updates")}
          </button>
          {devEnabled && (
            <button
              type="button"
              className={tab === "dev" ? "active" : ""}
              onClick={() => setTab("dev")}
            >
              {t("admin.devDebug")}
            </button>
          )}
        </div>
      </header>
      <main className="admin-content">
        {tab === "general" && <GeneralSettings />}
        {tab === "categories" && <CategoryManager />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "updates" && <Updates />}
        {tab === "dev" && devEnabled && <DevDebug />}
      </main>
    </div>
  );
}
