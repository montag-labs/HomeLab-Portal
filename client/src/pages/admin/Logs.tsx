import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../context/ConfigContext";
import type { LogPolicy, LogRotation, LogSource } from "../../types";

const DEFAULT_POLICY: LogPolicy = { rotation: "day", archiveCount: 7 };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Logs() {
  const { config, refresh } = useConfig();
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<LogSource[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [content, setContent] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [policy, setPolicy] = useState<LogPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedLog = logs.find((log) => log.id === selectedId);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLogs, nextPolicy] = await Promise.all([api.getLogs(), api.getLogPolicy()]);
      setLogs(nextLogs);
      setPolicy(nextPolicy);
      setSelectedId((current) => current || nextLogs[0]?.id || "");
      setError("");
    } catch {
      setError(t("admin.logLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadContent = useCallback(async (id: string) => {
    if (!id) return;
    setContentLoading(true);
    try {
      const result = await api.getLog(id);
      setContent(result.content);
      setTruncated(result.truncated);
      setError("");
    } catch {
      setError(t("admin.logLoadError"));
    } finally {
      setContentLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    void loadContent(selectedId);
  }, [loadContent, selectedId]);

  useEffect(() => {
    if (config?.settings.logPolicy) setPolicy(config.settings.logPolicy);
  }, [config?.settings.logPolicy]);

  const refreshAfterAction = async (message: string) => {
    await loadLogs();
    await loadContent(selectedId);
    setNotice(message);
  };

  const archive = async () => {
    if (!selectedId || !window.confirm(t("admin.logConfirmArchive"))) return;
    try {
      await api.archiveLog(selectedId);
      await refreshAfterAction(t("admin.logArchive"));
    } catch {
      setError(t("admin.logLoadError"));
    }
  };

  const empty = async () => {
    if (!selectedId || !window.confirm(t("admin.logConfirmEmpty"))) return;
    try {
      await api.emptyLog(selectedId);
      await refreshAfterAction(t("admin.logNew"));
    } catch {
      setError(t("admin.logLoadError"));
    }
  };

  const savePolicy = async () => {
    try {
      await api.updateLogPolicy(policy);
      await refresh();
      setNotice(t("admin.logPolicySaved"));
    } catch {
      setError(t("admin.logLoadError"));
    }
  };

  return (
    <div className="admin-section logs-page">
      <h2>{t("admin.logsTitle")}</h2>
      <p className="admin-section-description">{t("admin.logsDescription")}</p>
      {error && <p className="update-error">{error}</p>}
      {notice && <p className="admin-log-notice">{notice}</p>}

      <div className="admin-tools-card">
        <h3>{t("admin.logPolicy")}</h3>
        <div className="admin-log-policy">
          <label className="admin-field">
            {t("admin.logRotation")}
            <select
              value={policy.rotation}
              onChange={(event) => setPolicy({ ...policy, rotation: event.target.value as LogRotation })}
            >
              <option value="day">{t("admin.logDay")}</option>
              <option value="week">{t("admin.logWeek")}</option>
              <option value="month">{t("admin.logMonth")}</option>
              <option value="year">{t("admin.logYear")}</option>
            </select>
          </label>
          <label className="admin-field">
            {t("admin.logArchiveCount")}
            <input
              type="number"
              min="0"
              max="100"
              value={policy.archiveCount}
              onChange={(event) => setPolicy({ ...policy, archiveCount: Number(event.target.value) })}
            />
          </label>
          <button type="button" className="btn" onClick={savePolicy}>
            {t("admin.logSavePolicy")}
          </button>
        </div>
      </div>

      {loading ? (
        <p>{t("admin.logLoading")}</p>
      ) : (
        <div className="admin-log-layout">
          <div className="admin-tools-card admin-log-sources">
            <label className="admin-field">
              {t("admin.logSelect")}
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {logs.map((log) => (
                  <option key={log.id} value={log.id}>
                    {log.label} {!log.available ? `(${t("admin.logUnavailable")})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedLog && (
              <div className="admin-log-meta">
                <span>{t("admin.logSize")}: {formatBytes(selectedLog.size)}</span>
                {selectedLog.modifiedAt && (
                  <span>{t("admin.logModified")}: {new Date(selectedLog.modifiedAt).toLocaleString(i18n.language)}</span>
                )}
              </div>
            )}
            <div className="admin-tools-actions">
              {selectedLog?.available && (
                <a className="btn" href={`/api/logs/${encodeURIComponent(selectedId)}/download`} download>
                  {t("admin.logDownload")}
                </a>
              )}
              <button type="button" className="btn" onClick={archive} disabled={!selectedLog?.available}>
                {t("admin.logArchive")}
              </button>
              <button type="button" className="btn" onClick={empty}>
                {t("admin.logNew")}
              </button>
            </div>
            <div className="admin-log-archives">
              <strong>{t("admin.logArchive")}</strong>
              {selectedLog?.archives.length ? selectedLog.archives.map((archiveItem) => (
                <a
                  key={archiveItem.id}
                  href={`/api/logs/${encodeURIComponent(selectedId)}/archives/${encodeURIComponent(archiveItem.id)}/download`}
                  download
                >
                  {archiveItem.fileName} ({formatBytes(archiveItem.size)})
                </a>
              )) : <span>{t("admin.logNoArchives")}</span>}
            </div>
          </div>
          <div className="admin-tools-card admin-log-viewer">
            {contentLoading ? <p>{t("admin.logLoading")}</p> : content ? <pre>{content}</pre> : <p>{t("admin.logEmpty")}</p>}
            {truncated && <p className="admin-log-truncated">{t("admin.logReadMore")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
