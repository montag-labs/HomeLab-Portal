import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import { PortalPage } from "./pages/PortalPage";
import { AdminPage } from "./pages/AdminPage";
import { UpdateTokenNotice } from "./components/UpdateTokenNotice";

function App() {
  return (
    <ConfigProvider>
      <ConfigErrorNotice />
      <UpdateTokenNotice />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalPage />} />
          <Route path="/admin" element={<AdminPage />} />
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
