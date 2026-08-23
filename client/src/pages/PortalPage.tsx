import { Sidebar } from "../components/Sidebar";
import { GrafanaPanelStub } from "../components/GrafanaPanelStub";

export function PortalPage() {
  return (
    <div className="portal-layout">
      <Sidebar />
      <main className="portal-main">
        <GrafanaPanelStub />
      </main>
    </div>
  );
}
