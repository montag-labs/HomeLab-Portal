import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GeneralSettings } from "./admin/GeneralSettings";
import { CategoryManager } from "./admin/CategoryManager";
import { Dashboard } from "./admin/Dashboard";
import { Updates } from "./admin/Updates";

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"general" | "categories" | "dashboard" | "updates">("general");

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
        </div>
      </header>
      <main className="admin-content">
        {tab === "general" && <GeneralSettings />}
        {tab === "categories" && <CategoryManager />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "updates" && <Updates />}
      </main>
    </div>
  );
}
