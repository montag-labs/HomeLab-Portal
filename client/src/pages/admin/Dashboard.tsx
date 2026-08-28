import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../hooks/useConfig";
import type { GrafanaSettings } from "../../types";

const defaultGrafana: GrafanaSettings = {
  enabled: false,
  url: "",
  dashboardUid: "",
  dashboardSlug: "",
  timeRange: "now-6h",
  refreshInterval: "",
};

export function Dashboard() {
  const { config, refresh } = useConfig();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [grafanaDraft, setGrafanaDraft] = useState<GrafanaSettings>(
    () => ({ ...defaultGrafana, ...config?.settings.grafana }),
  );

  if (!config) return null;

  const updateGrafana = (patch: Partial<GrafanaSettings>) => {
    setGrafanaDraft((current) => ({ ...current, ...patch }));
  };

  const saveGrafana = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ ...config.settings, grafana: grafanaDraft });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-section">
      <h2>{t("admin.dashboard")}</h2>
      <div className="admin-tools-card grafana-settings">
        <h3>{t("admin.grafanaTitle")}</h3>
        <p>{t("admin.grafanaDescription")}</p>
        <label className="admin-checkbox-field">
          <input
            type="checkbox"
            checked={grafanaDraft.enabled}
            disabled={saving}
            onChange={(e) => updateGrafana({ enabled: e.target.checked })}
          />
          {t("admin.grafanaEnabled")}
        </label>
        <label className="admin-field">
          {t("admin.grafanaUrl")}
          <input
            type="url"
            value={grafanaDraft.url}
            disabled={saving}
            placeholder="https://grafana.example.com"
            onChange={(e) => updateGrafana({ url: e.target.value })}
          />
        </label>
        <label className="admin-field">
          {t("admin.grafanaDashboardUid")}
          <input
            value={grafanaDraft.dashboardUid}
            disabled={saving}
            onChange={(e) => updateGrafana({ dashboardUid: e.target.value })}
          />
        </label>
        <label className="admin-field">
          {t("admin.grafanaDashboardSlug")}
          <input
            value={grafanaDraft.dashboardSlug}
            disabled={saving}
            onChange={(e) => updateGrafana({ dashboardSlug: e.target.value })}
          />
        </label>
        <label className="admin-field">
          {t("admin.grafanaTimeRange")}
          <select
            value={grafanaDraft.timeRange}
            disabled={saving}
            onChange={(e) => updateGrafana({ timeRange: e.target.value })}
          >
            <option value="now-1h">1h</option>
            <option value="now-6h">6h</option>
            <option value="now-24h">24h</option>
            <option value="now-7d">7d</option>
            <option value="now-30d">30d</option>
          </select>
        </label>
        <label className="admin-field">
          {t("admin.grafanaRefresh")}
          <select
            value={grafanaDraft.refreshInterval}
            disabled={saving}
            onChange={(e) => updateGrafana({ refreshInterval: e.target.value })}
          >
            <option value="">{t("admin.grafanaRefreshOff")}</option>
            <option value="5s">5s</option>
            <option value="10s">10s</option>
            <option value="30s">30s</option>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="30m">30m</option>
            <option value="1h">1h</option>
          </select>
        </label>
        <button type="button" className="btn" disabled={saving} onClick={saveGrafana}>
          {t("admin.saveGrafana")}
        </button>
      </div>
    </div>
  );
}
