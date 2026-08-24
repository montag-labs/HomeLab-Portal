import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";

export function DevDebug() {
  const { t } = useTranslation();
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDevDebug().then(setDebug).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <div className="admin-section">
      <h2>{t("admin.devDebug")}</h2>
      <div className="admin-tools-card dev-debug-card">
        <p>{t("admin.devDebugDescription")}</p>
        {error && <p className="update-error">{error}</p>}
        {!debug && !error && <p>{t("admin.updateLoading")}</p>}
        {debug && <pre className="dev-debug-output">{JSON.stringify(debug, null, 2)}</pre>}
      </div>
    </div>
  );
}
