import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  Clock3,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { api } from "../../api";
import { useConfig } from "../../hooks/useConfig";
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
  const [policy, setPolicy] = useState<LogPolicy>(() => config?.settings.logPolicy ?? DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedLog = logs.find((log) => log.id === selectedId);
  const sourceLabel = (log: LogSource) =>
    t(`admin.logSources.${log.id}`, { defaultValue: log.label });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLogs, nextPolicy] = await Promise.all([api.getLogs(), api.getLogPolicy()]);
      setLogs(nextLogs);
      setPolicy(nextPolicy);
      setSelectedId((current) =>
        nextLogs.some((log) => log.id === current) ? current : nextLogs[0]?.id ?? "");
      setError("");
    } catch {
      setError(t("admin.logLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadContent = useCallback(async (id: string) => {
    if (!id) {
      setContent("");
      setTruncated(false);
      return;
    }
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
    // Async API loading is the external synchronization performed by this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    // The selected external log source determines which API resource is loaded.
    // oxlint-disable-next-line react/set-state-in-effect
    void loadContent(selectedId);
  }, [loadContent, selectedId]);

  const refreshAfterAction = async (message: string) => {
    await loadLogs();
    await loadContent(selectedId);
    setNotice(message);
  };

  const reload = async () => {
    setNotice("");
    await loadLogs();
    await loadContent(selectedId);
  };

  const archive = async () => {
    if (!selectedId || !window.confirm(t("admin.logConfirmArchive"))) return;
    try {
      await api.archiveLog(selectedId);
      await refreshAfterAction(t("admin.logArchived"));
    } catch {
      setError(t("admin.logLoadError"));
    }
  };

  const empty = async () => {
    if (!selectedId || !window.confirm(t("admin.logConfirmEmpty"))) return;
    try {
      await api.emptyLog(selectedId);
      await refreshAfterAction(t("admin.logEmptied"));
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

      <section className="admin-log-control-card">
        <div className="admin-log-control-copy">
          <span className="admin-log-control-icon"><Archive size={21} /></span>
          <div>
            <h3>{t("admin.logPolicy")}</h3>
            <p>{t("admin.logPolicyDescription")}</p>
          </div>
        </div>
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
          <label className="admin-field admin-log-count-field">
            {t("admin.logArchiveCount")}
            <input
              type="number"
              min="0"
              max="100"
              value={policy.archiveCount}
              onChange={(event) => setPolicy({ ...policy, archiveCount: Number(event.target.value) })}
            />
          </label>
          <button type="button" className="btn admin-log-save" onClick={savePolicy}>
            <Save size={16} /> {t("admin.logSavePolicy")}
          </button>
        </div>
      </section>

      {error && <p className="update-error admin-log-message">{error}</p>}
      {notice && <p className="admin-log-notice admin-log-message">{notice}</p>}

      {loading ? (
        <div className="admin-log-loading"><RefreshCw size={20} /> {t("admin.logLoading")}</div>
      ) : logs.length === 0 ? (
        <div className="admin-log-empty-state"><FileText size={28} /><p>{t("admin.logNoSources")}</p></div>
      ) : (
        <div className="admin-log-workspace">
          <aside className="admin-log-source-panel">
            <header>
              <div>
                <span>{t("admin.logsTitle")}</span>
                <strong>{t("admin.logSourcesCount", { count: logs.length })}</strong>
              </div>
              <HardDrive size={19} />
            </header>
            <div className="admin-log-source-list">
              {logs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  className={log.id === selectedId ? "active" : ""}
                  onClick={() => {
                    setNotice("");
                    setSelectedId(log.id);
                  }}
                >
                  <span className={`admin-log-source-state ${log.available ? "available" : ""}`} />
                  <span className="admin-log-source-copy">
                    <strong>{sourceLabel(log)}</strong>
                    <small>
                      {log.available ? formatBytes(log.size) : t("admin.logUnavailable")}
                      <span>·</span>
                      {t("admin.logArchiveTotal", { count: log.archives.length })}
                    </small>
                  </span>
                  <FileText size={17} />
                </button>
              ))}
            </div>
          </aside>

          <section className="admin-log-console-panel">
            <header className="admin-log-console-header">
              <div className="admin-log-console-title">
                <span className="admin-log-console-icon"><FileText size={20} /></span>
                <div>
                  <h3>{selectedLog ? sourceLabel(selectedLog) : t("admin.logsTitle")}</h3>
                  <span>
                    {selectedLog?.available ? t("admin.logAvailable") : t("admin.logUnavailable")}
                    {selectedLog?.modifiedAt && (
                      <> · {t("admin.logModified")} {new Date(selectedLog.modifiedAt).toLocaleString(i18n.language)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="admin-log-actions">
                <button type="button" className="btn" onClick={() => void reload()} title={t("admin.logRefresh")}>
                  <RefreshCw size={16} /> <span>{t("admin.logRefresh")}</span>
                </button>
                {selectedLog?.available && (
                  <a
                    className="btn"
                    href={`/api/logs/${encodeURIComponent(selectedId)}/download`}
                    download
                  >
                    <Download size={16} /> <span>{t("admin.logDownload")}</span>
                  </a>
                )}
                <button type="button" className="btn" onClick={archive} disabled={!selectedLog?.available}>
                  <Archive size={16} /> <span>{t("admin.logArchive")}</span>
                </button>
                <button type="button" className="btn admin-log-danger" onClick={empty}>
                  <Trash2 size={16} /> <span>{t("admin.logNew")}</span>
                </button>
              </div>
            </header>

            <div className="admin-log-viewer">
              {contentLoading ? (
                <div className="admin-log-viewer-state"><RefreshCw size={20} /> {t("admin.logLoading")}</div>
              ) : content ? (
                <pre>{content}</pre>
              ) : (
                <div className="admin-log-viewer-state"><FileText size={24} /> {t("admin.logEmpty")}</div>
              )}
            </div>

            <footer className="admin-log-console-footer">
              <span><HardDrive size={14} /> {formatBytes(selectedLog?.size ?? 0)}</span>
              {truncated && <span className="admin-log-truncated">{t("admin.logReadMore")}</span>}
            </footer>

            <div className="admin-log-archives">
              <div className="admin-log-archives-heading">
                <div>
                  <h4>{t("admin.logArchivesTitle")}</h4>
                  <p>{t("admin.logArchivesDescription")}</p>
                </div>
                <span>{selectedLog?.archives.length ?? 0}</span>
              </div>
              {selectedLog?.archives.length ? (
                <div className="admin-log-archive-list">
                  {selectedLog.archives.map((archiveItem) => (
                    <a
                      key={archiveItem.id}
                      href={`/api/logs/${encodeURIComponent(selectedId)}/archives/${encodeURIComponent(archiveItem.id)}/download`}
                      download
                    >
                      <span className="admin-log-archive-icon"><Archive size={16} /></span>
                      <span>
                        <strong>{archiveItem.fileName}</strong>
                        <small>
                          {formatBytes(archiveItem.size)}
                          <span>·</span>
                          <Clock3 size={12} />
                          {new Date(archiveItem.modifiedAt).toLocaleString(i18n.language)}
                        </small>
                      </span>
                      <Download size={16} />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="admin-log-no-archives">{t("admin.logNoArchives")}</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
