import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "./context/ConfigContext";
import { useConfig } from "./hooks/useConfig";
import { PortalPage } from "./pages/PortalPage";
import { AdminPage } from "./pages/AdminPage";
import { AuthProvider } from "./context/AuthProvider";

function App() {
  return (
    <ConfigProvider>
      <ConfigErrorNotice />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PortalPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </AuthProvider>
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
