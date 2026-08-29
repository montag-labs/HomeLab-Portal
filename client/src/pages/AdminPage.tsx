import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { GeneralSettings } from "./admin/GeneralSettings";
import { CategoryManager } from "./admin/CategoryManager";
import { Dashboard } from "./admin/Dashboard";
import { Updates } from "./admin/Updates";
import { DevDebug } from "./admin/DevDebug";
import { Logs } from "./admin/Logs";
import { SsoSettings } from "./admin/SsoSettings";
import { AdminLogin } from "../components/AdminLogin";
import { BrandIdentity } from "../components/BrandIdentity";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft,
  Bug,
  ChartNoAxesCombined,
  LayoutGrid,
  KeyRound,
  LogOut,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
} from "lucide-react";

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"general" | "sso" | "categories" | "dashboard" | "updates" | "logs" | "dev">(() => {
    const query = new URLSearchParams(window.location.search);
    return query.has("sso_verified") || query.has("sso_error") ? "sso" : "general";
  });
  const [devEnabled, setDevEnabled] = useState(false);
  const { session, loading, logout } = useAuth();

  useEffect(() => {
    if (!session?.authenticated) return;
    api.getDevAvailability().then((result) => setDevEnabled(result.enabled)).catch(() => setDevEnabled(false));
  }, [session?.authenticated]);

  if (loading) return <main className="admin-login"><p>{t("auth.loading")}</p></main>;
  if (!session?.authenticated) return <AdminLogin />;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" to="/">
          <BrandIdentity />
        </Link>
        <div className="admin-sidebar-label">{t("nav.admin")}</div>
        <nav className="admin-tabs" aria-label={t("nav.admin")}>
          <button
            type="button"
            className={tab === "general" ? "active" : ""}
            onClick={() => setTab("general")}
          >
            <Settings2 size={18} />
            {t("admin.general")}
          </button>
          <button
            type="button"
            className={tab === "sso" ? "active" : ""}
            onClick={() => setTab("sso")}
          >
            <KeyRound size={18} />
            {t("admin.sso")}
          </button>
          <button
            type="button"
            className={tab === "categories" ? "active" : ""}
            onClick={() => setTab("categories")}
          >
            <LayoutGrid size={18} />
            {t("admin.categories")}
          </button>
          <button
            type="button"
            className={tab === "dashboard" ? "active" : ""}
            onClick={() => setTab("dashboard")}
          >
            <ChartNoAxesCombined size={18} />
            {t("admin.dashboard")}
          </button>
          <button
            type="button"
            className={tab === "updates" ? "active" : ""}
            onClick={() => setTab("updates")}
          >
            <RefreshCw size={18} />
            {t("admin.updates")}
          </button>
          <button
            type="button"
            className={tab === "logs" ? "active" : ""}
            onClick={() => setTab("logs")}
          >
            <ScrollText size={18} />
            {t("admin.logs")}
          </button>
          {devEnabled && (
            <button
              type="button"
              className={tab === "dev" ? "active" : ""}
              onClick={() => setTab("dev")}
            >
              <Bug size={18} />
              {t("admin.devDebug")}
            </button>
          )}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-session-status">
            <ShieldCheck size={18} />
            <span><strong>{t("auth.securityTitle")}</strong>{t("admin.secureSession")}</span>
          </div>
          <Link className="admin-sidebar-action" to="/"><ArrowLeft size={17} />{t("auth.backToPortal")}</Link>
          <button type="button" className="admin-sidebar-action" onClick={() => logout()}>
            <LogOut size={17} />{t("auth.logout")}
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <main className="admin-content">
          {tab === "general" && <GeneralSettings />}
          {tab === "sso" && <SsoSettings />}
          {tab === "categories" && <CategoryManager />}
          {tab === "dashboard" && <Dashboard />}
          {tab === "updates" && <Updates />}
          {tab === "logs" && <Logs />}
          {tab === "dev" && devEnabled && <DevDebug />}
        </main>
      </div>
    </div>
  );
}
