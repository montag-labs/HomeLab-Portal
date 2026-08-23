import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../context/ConfigContext";
import type { GrafanaSettings, Language, ThemeMode } from "../../types";

const defaultGrafana: GrafanaSettings = {
  enabled: false,
  url: "",
  dashboardUid: "",
  dashboardSlug: "",
  timeRange: "now-6h",
  refreshInterval: "",
};

export function GeneralSettings() {
  const { config, refresh } = useConfig();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [grafanaDraft, setGrafanaDraft] = useState<GrafanaSettings>(defaultGrafana);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setGrafanaDraft({ ...defaultGrafana, ...config?.settings.grafana });
  }, [config?.settings.grafana]);

  if (!config) return null;
  const { settings } = config;

  const update = async (patch: Partial<typeof settings>) => {
    setSaving(true);
    try {
      await api.updateSettings({ ...settings, ...patch });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const updateGrafana = (patch: Partial<GrafanaSettings>) => {
    setGrafanaDraft((current) => ({ ...current, ...patch }));
  };

  const saveGrafana = async () => {
    await update({ grafana: grafanaDraft });
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "homelab-portal-config.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    await api.updateConfig(parsed);
    await refresh();
  };

  return (
    <div className="admin-section">
      <h2>{t("admin.general")}</h2>
      <label className="admin-field">
        {t("admin.language")}
        <select
          value={settings.language}
          disabled={saving}
          onChange={(e) => update({ language: e.target.value as Language })}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="admin-field">
        {t("admin.theme")}
        <select
          value={settings.theme}
          disabled={saving}
          onChange={(e) => update({ theme: e.target.value as ThemeMode })}
        >
          <option value="light">{t("admin.themeLight")}</option>
          <option value="dark">{t("admin.themeDark")}</option>
        </select>
      </label>
      <label className="admin-field">
        {t("admin.accentColor")}
        <input
          type="color"
          value={settings.accentColor}
          disabled={saving}
          onChange={(e) => update({ accentColor: e.target.value })}
        />
      </label>
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
      <div className="admin-tools-card">
        <h3>{t("admin.configTransferTitle")}</h3>
        <p>{t("admin.configTransferDescription")}</p>
        <div className="admin-tools-actions">
          <button type="button" className="btn" onClick={exportConfig}>
            {t("admin.exportConfig")}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {t("admin.importConfig")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await importConfig(file);
                window.alert(t("admin.importSuccess"));
              } catch {
                window.alert(t("admin.importError"));
              } finally {
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
