import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ConfigProvider } from "./context/ConfigContext";
import { useConfig } from "./hooks/useConfig";
import { PortalPage } from "./pages/PortalPage";

const AdminRoute = lazy(async () => {
  const module = await import("./pages/AdminRoute");
  return { default: module.AdminRoute };
});

function AdminRouteLoader() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<main className="admin-login"><p>{t("auth.loading")}</p></main>}>
      <AdminRoute />
    </Suspense>
  );
}

function App() {
  return (
    <ConfigProvider>
      <ConfigErrorNotice />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalPage />} />
          <Route path="/admin" element={<AdminRouteLoader />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function ConfigErrorNotice() {
  const { error, loading, refresh } = useConfig();
  if (loading || !error) return null;

  return (
    <div className="config-error-notice" role="alert">
      <strong>Konfiguration konnte nicht geladen werden.</strong>
      <span>{error}</span>
      <button type="button" className="btn" onClick={() => refresh().catch(() => undefined)}>
        Erneut versuchen
      </button>
    </div>
  );
}

export default App;
