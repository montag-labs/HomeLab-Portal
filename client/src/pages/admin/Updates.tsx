import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import type { UpdateStatus } from "../../types";
import { formatDateTime } from "../../utils/date";

const MANUAL_UPDATE_COMMAND = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"';

export function Updates() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [manualCommandCopied, setManualCommandCopied] = useState(false);
  const [notification, setNotification] = useState<{ type: "error" | "success"; message: string } | null>(() => {
    if (window.sessionStorage.getItem("update-success") !== "1") return null;
    window.sessionStorage.removeItem("update-success");
    return { type: "success", message: t("admin.updateSuccess") };
  });

  useEffect(() => {
    if (!notification) return undefined;
    const timeout = window.setTimeout(() => setNotification(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      setStatus(await api.checkForUpdates());
    } catch {
      setNotification({ type: "error", message: `${t("admin.updateCheckError")} (${t("admin.updateCheckErrorCode")})` });
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
      const message = error instanceof Error ? error.message : t("admin.updateStartError");
      setStatus((current) =>
        current
          ? {
              ...current,
              state: "failed",
              error: message,
            }
          : current,
      );
      setNotification({ type: "error", message: `${message} (${t("admin.updateTriggerErrorCode")})` });
    } finally {
      setUpdating(false);
    }
  };

  const copyManualUpdateCommand = async () => {
    try {
      await navigator.clipboard.writeText(MANUAL_UPDATE_COMMAND);
      setManualCommandCopied(true);
      window.setTimeout(() => setManualCommandCopied(false), 2500);
    } catch {
      setNotification({ type: "error", message: t("admin.manualUpdateCopyError") });
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
        if (updateStatus.state === "failed") {
          setNotification({
            type: "error",
            message: `${updateStatus.error ?? t("admin.updateFailed")} (${updateStatus.errorCode ?? "UPDATE_SCRIPT_FAILED"})`,
          });
        }
        if (
          response.ok &&
          updateStatus.state === "current" &&
          (!expectedVersion || updateStatus.installedVersion === expectedVersion)
        ) {
          window.sessionStorage.setItem("update-success", "1");
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
      {notification && (
        <div className={`update-notification update-notification-${notification.type}`} role="alert">
          {notification.message}
          <button type="button" onClick={() => setNotification(null)} aria-label={t("admin.dismissNotification")}>×</button>
        </div>
      )}
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
        {status?.errorCode === "UPDATE_SCRIPT_FAILED" && status.capabilities.mode === "lxc" && (
          <div className="update-manual-fallback" role="alert">
            <strong>{t("admin.manualUpdateTitle")}</strong>
            <p>{t("admin.manualUpdateDescription")}</p>
            <div className="update-manual-command">
              <code>{MANUAL_UPDATE_COMMAND}</code>
              <button type="button" className="btn" onClick={copyManualUpdateCommand}>
                {manualCommandCopied ? t("admin.manualUpdateCopied") : t("admin.manualUpdateCopy")}
              </button>
            </div>
          </div>
        )}
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
