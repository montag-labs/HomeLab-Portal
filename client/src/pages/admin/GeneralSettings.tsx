import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../hooks/useConfig";
import type { Language } from "../../types";
import { AdminPasswordSettings } from "../../components/AdminPasswordSettings";

export function GeneralSettings() {
  const { config, refresh } = useConfig();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      <div className="admin-tools-card general-settings-card">
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
          {t("admin.accentColor")}
          <input
            type="color"
            value={settings.accentColor}
            disabled={saving}
            onChange={(e) => update({ accentColor: e.target.value })}
          />
        </label>
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
      <AdminPasswordSettings />
    </div>
  );
}
