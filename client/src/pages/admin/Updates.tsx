import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import type { UpdateStatus } from "../../types";
import { formatDateTime } from "../../utils/date";

export function Updates() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  const installUpdate = async () => {
    if (status?.capabilities.mode !== "lxc" || !status.updateAvailable) {
      return;
    }
    setUpdating(true);
    try {
      const result = await api.installUpdate();
      setStatus((current) => (current ? { ...current, state: "updating", error: result.message } : current));
      waitForServerRestart(status.latestVersion);
    } catch (error) {
      setStatus((current) =>
        current
          ? {
              ...current,
              state: "failed",
              error: error instanceof Error ? error.message : t("admin.updateStartError"),
            }
          : current,
      );
    } finally {
      setUpdating(false);
    }
  };

  const waitForServerRestart = (expectedVersion?: string) => {
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/update", { cache: "no-store" });
        const updateStatus = (await response.json()) as UpdateStatus;
        setStatus(updateStatus);
        if (
          response.ok &&
          updateStatus.state === "current" &&
          (!expectedVersion || updateStatus.installedVersion === expectedVersion)
        ) {
          window.location.reload();
          return;
        }
      } catch {
        // The server is expected to be unavailable while it restarts.
      }
      if (attempts < 90) window.setTimeout(check, 2000);
    };
    window.setTimeout(check, 2000);
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
            <dd>{status ? formatDateTime(status.checkedAt, i18n.language) : "-"}</dd>
          </div>
        </dl>
        {status?.progress && status.state === "updating" && (
          <div className="update-progress" aria-live="polite">
            <div className="update-progress-label">
              <span>{status.progress.step}</span>
              <strong>{status.progress.percent}%</strong>
            </div>
            <div
              className="update-progress-track"
              role="progressbar"
              aria-label={t("admin.updateProgress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status.progress.percent}
            >
              <div className="update-progress-bar" style={{ width: `${status.progress.percent}%` }} />
            </div>
          </div>
        )}
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
          <button
            type="button"
            className="btn"
            disabled={status?.capabilities.mode !== "lxc" || !status.updateAvailable || updating || status.state === "updating"}
            onClick={installUpdate}
            title={
              status?.capabilities.mode !== "lxc"
                ? status?.capabilities.reason
                : !status.updateAvailable
                  ? t("admin.noUpdateAvailable")
                  : undefined
            }
          >
            {updating ? t("admin.installingUpdate") : t("admin.installUpdate")}
          </button>
        </div>
      </div>
    </div>
  );
}
