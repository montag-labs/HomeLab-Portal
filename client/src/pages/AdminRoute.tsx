import { AuthProvider } from "../context/AuthProvider";
import { AdminPage } from "./AdminPage";

export function AdminRoute() {
  return (
    <AuthProvider>
      <AdminPage />
    </AuthProvider>
  );
}
