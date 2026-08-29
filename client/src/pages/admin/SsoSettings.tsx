import { useEffect, useState } from "react";
import { Check, ExternalLink, KeyRound, Save, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import type { OidcAdminConfig, OidcAdminConfigInput, OidcClientAuthMethod } from "../../types";

interface OidcForm {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedGroups: string;
  groupsClaim: string;
  scopes: string;
  displayName: string;
  clientAuthMethod: OidcClientAuthMethod;
  disablePasswordLogin: boolean;
  clearClientSecret: boolean;
}

function toForm(config: OidcAdminConfig): OidcForm {
  return {
    enabled: config.enabled,
    issuerUrl: config.issuerUrl,
    clientId: config.clientId,
    clientSecret: "",
    redirectUri: config.redirectUri,
    allowedGroups: config.allowedGroups.join(", "),
    groupsClaim: config.groupsClaim,
    scopes: config.scopes,
    displayName: config.displayName,
    clientAuthMethod: config.clientAuthMethod,
    disablePasswordLogin: config.disablePasswordLogin,
    clearClientSecret: false,
  };
}

export function SsoSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<OidcAdminConfig | null>(null);
  const [form, setForm] = useState<OidcForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(() =>
    new URLSearchParams(window.location.search).has("sso_error") ? t("admin.ssoTestFailed") : ""
  );

  useEffect(() => {
    api.getOidcConfig()
      .then((result) => {
        setConfig(result);
        setForm(toForm(result));
        if (new URLSearchParams(window.location.search).has("sso_verified")) {
          setNotice(t("admin.ssoTestSuccess"));
        }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : t("admin.ssoLoadError")));
  }, [t]);

  if (!config || !form) return <div className="admin-section"><p>{t("admin.ssoLoading")}</p></div>;

  const update = <Key extends keyof OidcForm>(key: Key, value: OidcForm[Key]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setNotice("");
    setError("");
  };

  const save = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    const payload: OidcAdminConfigInput = {
      enabled: form.enabled,
      issuerUrl: form.issuerUrl,
      clientId: form.clientId,
      clientSecret: form.clientSecret || undefined,
      redirectUri: form.redirectUri,
      allowedGroups: form.allowedGroups.split(/[,\n]/).map((group) => group.trim()).filter(Boolean),
      groupsClaim: form.groupsClaim,
      scopes: form.scopes,
      displayName: form.displayName,
      clientAuthMethod: form.clientAuthMethod,
      disablePasswordLogin: form.disablePasswordLogin,
      clearClientSecret: form.clearClientSecret,
    };
    try {
      const saved = await api.updateOidcConfig(payload);
      setConfig(saved);
      setForm(toForm(saved));
      setNotice(t("admin.ssoSaved"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.ssoSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || config.managedByEnvironment;
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(toForm(config));
  return (
    <div className="admin-section sso-settings-page">
      <div className="sso-settings-heading">
        <div>
          <h2>{t("admin.ssoTitle")}</h2>
          <p>{t("admin.ssoDescription")}</p>
        </div>
        <label className="sso-enable-control">
          <span><strong>{t("admin.ssoEnabled")}</strong><small>{form.enabled ? t("admin.ssoActive") : t("admin.ssoInactive")}</small></span>
          <input type="checkbox" checked={form.enabled} disabled={disabled} onChange={(event) => update("enabled", event.target.checked)} />
          <span className="dashboard-switch" aria-hidden="true" />
        </label>
      </div>

      {config.managedByEnvironment && (
        <div className="sso-info-message"><ShieldAlert size={18} /><span>{t("admin.ssoManagedByEnvironment")}</span></div>
      )}

      <section className="admin-tools-card sso-config-card">
        <div className="sso-section-title"><KeyRound size={20} /><div><h3>{t("admin.ssoProvider")}</h3><p>{t("admin.ssoProviderDescription")}</p></div></div>
        <div className="sso-form-grid">
          <label className="admin-field sso-wide-field">{t("admin.ssoIssuerUrl")}<input type="url" value={form.issuerUrl} disabled={disabled} placeholder="https://auth.example.com/application/o/homelab-portal/" onChange={(event) => update("issuerUrl", event.target.value)} /></label>
          <label className="admin-field">{t("admin.ssoClientId")}<input value={form.clientId} disabled={disabled} onChange={(event) => update("clientId", event.target.value)} /></label>
          <label className="admin-field">{t("admin.ssoDisplayName")}<input value={form.displayName} disabled={disabled} onChange={(event) => update("displayName", event.target.value)} /></label>
          <label className="admin-field">{t("admin.ssoClientAuthMethod")}<select value={form.clientAuthMethod} disabled={disabled} onChange={(event) => update("clientAuthMethod", event.target.value as OidcClientAuthMethod)}><option value="client_secret_post">client_secret_post</option><option value="client_secret_basic">client_secret_basic</option><option value="none">none</option></select></label>
          <label className="admin-field">{t("admin.ssoClientSecret")}<input type="password" value={form.clientSecret} disabled={disabled || form.clearClientSecret} autoComplete="new-password" placeholder={config.clientSecretConfigured ? t("admin.ssoSecretStored") : t("admin.ssoSecretPlaceholder")} onChange={(event) => update("clientSecret", event.target.value)} /></label>
          {config.clientSecretConfigured && !config.managedByEnvironment && <label className="sso-check-field"><input type="checkbox" checked={form.clearClientSecret} disabled={saving} onChange={(event) => update("clearClientSecret", event.target.checked)} />{t("admin.ssoClearSecret")}</label>}
          <label className="admin-field sso-wide-field">{t("admin.ssoRedirectUri")}<input type="url" value={form.redirectUri} disabled={disabled} placeholder="https://portal.example.com/api/auth/oidc/callback" onChange={(event) => update("redirectUri", event.target.value)} /></label>
          <label className="admin-field sso-wide-field">{t("admin.ssoAllowedGroups")}<input value={form.allowedGroups} disabled={disabled} placeholder="homelab-admins" onChange={(event) => update("allowedGroups", event.target.value)} /><small>{t("admin.ssoAllowedGroupsHint")}</small></label>
          <label className="admin-field">{t("admin.ssoGroupsClaim")}<input value={form.groupsClaim} disabled={disabled} onChange={(event) => update("groupsClaim", event.target.value)} /></label>
          <label className="admin-field">{t("admin.ssoScopes")}<input value={form.scopes} disabled={disabled} onChange={(event) => update("scopes", event.target.value)} /></label>
        </div>
      </section>

      <section className="admin-tools-card sso-security-card">
        <div className="sso-section-title"><ShieldAlert size={20} /><div><h3>{t("admin.ssoSecurity")}</h3><p>{t("admin.ssoSecurityDescription")}</p></div></div>
        <label className="sso-check-field">
          <input
            type="checkbox"
            checked={form.disablePasswordLogin}
            disabled={disabled || (!config.lastVerifiedAt && !form.disablePasswordLogin)}
            onChange={(event) => update("disablePasswordLogin", event.target.checked)}
          />
          <span><strong>{t("admin.ssoDisablePassword")}</strong><small>{config.lastVerifiedAt ? t("admin.ssoVerifiedAt", { date: new Date(config.lastVerifiedAt).toLocaleString() }) : t("admin.ssoTestRequired")}</small></span>
        </label>
      </section>

      {error && <p className="update-error sso-save-message">{error}</p>}
      {notice && <p className="dashboard-save-success sso-save-message"><Check size={16} /> {notice}</p>}

      <div className="sso-save-bar">
        <span>{t("admin.ssoSecretNotice")}</span>
        <div>
          <button type="button" className="btn" disabled={!config.enabled || hasUnsavedChanges} onClick={() => window.location.assign("/api/auth/oidc/login")}><ExternalLink size={17} />{t("admin.ssoTest")}</button>
          {!config.managedByEnvironment && <button type="button" className="btn" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? t("admin.ssoSaving") : t("admin.ssoSave")}</button>}
        </div>
      </div>
    </div>
  );
}
