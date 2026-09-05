import { useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Check,
  ExternalLink,
  HeartPulse,
  PanelsTopLeft,
  Save,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import {
  buildDashboardUrl,
  DASHBOARD_PROVIDERS,
  resolveDashboardSettings,
} from "../../dashboard";
import { useConfig } from "../../hooks/useConfig";
import type { DashboardProvider, DashboardSettings } from "../../types";

const PROVIDER_TITLES: Record<DashboardProvider, string> = {
  grafana: "Grafana",
  netdata: "Netdata",
  "uptime-kuma": "Uptime Kuma",
  custom: "",
};

function ProviderIcon({ provider, size = 21 }: { provider: DashboardProvider; size?: number }) {
  if (provider === "grafana") return <ChartNoAxesCombined size={size} />;
  if (provider === "netdata") return <Activity size={size} />;
  if (provider === "uptime-kuma") return <HeartPulse size={size} />;
  return <PanelsTopLeft size={size} />;
}

export function Dashboard() {
  const { config, refresh, theme } = useConfig();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DashboardSettings>(() =>
    resolveDashboardSettings(config?.settings),
  );

  if (!config) return null;

  const updateDashboard = (patch: Partial<DashboardSettings>) => {
    setNotice("");
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  const selectProvider = (provider: DashboardProvider) => {
    setDraft((current) => {
      const previousDefault = PROVIDER_TITLES[current.provider];
      const shouldReplaceTitle = !current.title || current.title === previousDefault;
      return {
        ...current,
        provider,
        title: shouldReplaceTitle ? PROVIDER_TITLES[provider] : current.title,
      };
    });
    setNotice("");
    setError("");
  };

  const saveDashboard = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await api.updateSettings({
        ...config.settings,
        dashboard: draft,
        grafana: undefined,
      });
      await refresh();
      setNotice(t("admin.dashboardSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("admin.dashboardSaveError"));
    } finally {
      setSaving(false);
    }
  };

  let previewUrl = "";
  if (draft.url) {
    try {
      previewUrl = buildDashboardUrl(draft, theme);
    } catch {
      previewUrl = "";
    }
  }

  return (
    <div className="admin-section dashboard-admin-page">
      <div className="dashboard-admin-heading">
        <div>
          <h2>{t("admin.dashboardHubTitle")}</h2>
          <p>{t("admin.dashboardHubDescription")}</p>
        </div>
        <label className="dashboard-enable-control">
          <span>
            <strong>{t("admin.dashboardEnabled")}</strong>
            <small>{draft.enabled ? t("admin.dashboardVisible") : t("admin.dashboardHidden")}</small>
          </span>
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={saving}
            onChange={(event) => updateDashboard({ enabled: event.target.checked })}
          />
          <span className="dashboard-switch" aria-hidden="true" />
        </label>
      </div>

      <section className="dashboard-provider-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>{t("admin.dashboardProviderTitle")}</h3>
            <p>{t("admin.dashboardProviderDescription")}</p>
          </div>
        </div>
        <div className="dashboard-provider-grid">
          {DASHBOARD_PROVIDERS.map((provider) => (
            <button
              key={provider}
              type="button"
              className={draft.provider === provider ? "active" : ""}
              disabled={saving}
              onClick={() => selectProvider(provider)}
            >
              <span className="dashboard-provider-icon"><ProviderIcon provider={provider} /></span>
              <span>
                <strong>{t(`admin.dashboardProviders.${provider}.title`)}</strong>
                <small>{t(`admin.dashboardProviders.${provider}.description`)}</small>
              </span>
              {draft.provider === provider && <Check className="dashboard-provider-check" size={17} />}
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-admin-grid">
        <section className="dashboard-config-card">
          <div className="dashboard-section-heading">
            <div>
              <h3>{t("admin.dashboardConfiguration")}</h3>
              <p>{t("admin.dashboardConfigurationDescription")}</p>
            </div>
            <span className="dashboard-provider-badge">
              <ProviderIcon provider={draft.provider} size={15} />
              {t(`admin.dashboardProviders.${draft.provider}.title`)}
            </span>
          </div>

          <div className="dashboard-form-grid">
            <label className="admin-field">
              {t("admin.dashboardTitleLabel")}
              <input
                value={draft.title}
                maxLength={80}
                disabled={saving}
                placeholder={t("admin.dashboardTitlePlaceholder")}
                onChange={(event) => updateDashboard({ title: event.target.value })}
              />
            </label>
            <label className="admin-field dashboard-url-field">
              {t("admin.dashboardUrl")}
              <input
                type="url"
                value={draft.url}
                disabled={saving}
                placeholder={t(`admin.dashboardProviders.${draft.provider}.placeholder`)}
                onChange={(event) => updateDashboard({ url: event.target.value })}
              />
            </label>
          </div>

          {draft.provider === "grafana" && (
            <div className="dashboard-grafana-options">
              <div className="dashboard-subsection-title">
                <h4>{t("admin.dashboardGrafanaOptions")}</h4>
                <p>{t("admin.dashboardGrafanaOptionsDescription")}</p>
              </div>
              <div className="dashboard-form-grid dashboard-form-grid-four">
                <label className="admin-field">
                  {t("admin.grafanaDashboardUid")}
                  <input
                    value={draft.dashboardUid}
                    disabled={saving}
                    onChange={(event) => updateDashboard({ dashboardUid: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  {t("admin.grafanaDashboardSlug")}
                  <input
                    value={draft.dashboardSlug}
                    disabled={saving}
                    onChange={(event) => updateDashboard({ dashboardSlug: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  {t("admin.grafanaTimeRange")}
                  <select
                    value={draft.timeRange}
                    disabled={saving}
                    onChange={(event) => updateDashboard({ timeRange: event.target.value })}
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
                    value={draft.refreshInterval}
                    disabled={saving}
                    onChange={(event) => updateDashboard({ refreshInterval: event.target.value })}
                  >
                    <option value="">{t("admin.grafanaRefreshOff")}</option>
                    {['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h'].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="dashboard-embed-notice">
            <PanelsTopLeft size={18} />
            <p>{t("admin.dashboardEmbedNotice")}</p>
          </div>
        </section>

        <aside className="dashboard-preview-card">
          <div className="dashboard-section-heading">
            <div>
              <h3>{t("admin.dashboardPreview")}</h3>
              <p>{t("admin.dashboardPreviewDescription")}</p>
            </div>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer" aria-label={t("dashboard.openExternal")}>
                <ExternalLink size={17} />
              </a>
            )}
          </div>
          <div className="dashboard-admin-preview">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                title={draft.title || t("dashboard.title")}
                src={previewUrl}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="dashboard-preview-empty">
                <ProviderIcon provider={draft.provider} size={28} />
                <strong>{t("admin.dashboardPreviewEmpty")}</strong>
                <span>{t("admin.dashboardPreviewEmptyDescription")}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {error && <p className="update-error dashboard-save-message">{error}</p>}
      {notice && <p className="dashboard-save-success dashboard-save-message"><Check size={16} /> {notice}</p>}

      <div className="dashboard-save-bar">
        <span>{t("admin.dashboardSaveHint")}</span>
        <button type="button" className="btn" disabled={saving} onClick={saveDashboard}>
          <Save size={17} />
          {saving ? t("admin.dashboardSaving") : t("admin.dashboardSave")}
        </button>
      </div>
    </div>
  );
}
