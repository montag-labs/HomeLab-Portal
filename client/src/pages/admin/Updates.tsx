import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import type { UpdateStatus } from "../../types";

export function Updates() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      setStatus(await api.checkForUpdates());
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    api.getUpdateStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const modeLabel = status
    ? t(`admin.updateModes.${status.capabilities.mode}`)
    : t("admin.updateLoading");

  return (
    <div className="admin-section">
      <h2>{t("admin.updates")}</h2>
      <div className="admin-tools-card update-card">
        <div className="update-card-header">
          <div>
            <h3>{t("admin.updateTitle")}</h3>
            <p>{t("admin.updateDescription")}</p>
          </div>
          <span className={`update-state update-state-${status?.state ?? "loading"}`}>
            {status ? t(`admin.updateStates.${status.state}`) : t("admin.updateLoading")}
          </span>
        </div>
        <dl className="update-details">
          <div>
            <dt>{t("admin.installedVersion")}</dt>
            <dd>{status?.installedVersion ?? "-"}</dd>
          </div>
          <div>
            <dt>{t("admin.latestVersion")}</dt>
            <dd>{status?.latestVersion ?? "-"}</dd>
          </div>
          <div>
            <dt>{t("admin.updateMode")}</dt>
            <dd>{modeLabel}</dd>
          </div>
          <div>
            <dt>{t("admin.lastChecked")}</dt>
            <dd>{status ? new Date(status.checkedAt).toLocaleString() : "-"}</dd>
          </div>
        </dl>
        {status?.error && <p className="update-error">{status.error}</p>}
        {status?.capabilities.reason && (
          <p className="update-hint">{status.capabilities.reason}</p>
        )}
        <div className="admin-tools-actions">
          <button type="button" className="btn" disabled={checking} onClick={checkForUpdates}>
            {checking ? t("admin.checkingUpdates") : t("admin.checkUpdates")}
          </button>
          {status?.releaseUrl && (
            <a className="btn update-release-link" href={status.releaseUrl} target="_blank" rel="noreferrer">
              {t("admin.viewRelease")}
            </a>
          )}
          <button type="button" className="btn" disabled={!status?.capabilities.canUpdate}>
            {t("admin.installUpdate")}
          </button>
        </div>
      </div>
    </div>
  );
}