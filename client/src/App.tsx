import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "./context/ConfigContext";
import { PortalPage } from "./pages/PortalPage";
import { AdminPage } from "./pages/AdminPage";
import { UpdateTokenNotice } from "./components/UpdateTokenNotice";

function App() {
  return (
    <ConfigProvider>
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

export default App;
