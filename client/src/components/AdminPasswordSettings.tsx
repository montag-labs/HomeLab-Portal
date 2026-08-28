import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

export function AdminPasswordSettings() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 12) {
      setError(t("admin.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmation) {
      setError(t("admin.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      await api.changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess(t("admin.passwordChanged"));
    } catch (reason) {
      const message = reason instanceof Error && reason.message === "Current password is incorrect"
        ? t("admin.currentPasswordIncorrect")
        : t("admin.passwordChangeError");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-tools-card admin-password-card" onSubmit={submit}>
      <div className="admin-card-heading">
        <span className="admin-card-icon"><KeyRound size={20} /></span>
        <div>
          <h3>{t("admin.passwordTitle")}</h3>
          <p>{t("admin.passwordDescription")}</p>
        </div>
      </div>
      <div className="admin-password-fields">
        <label className="admin-field">
          {t("admin.currentPassword")}
          <input
            type={showPasswords ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            disabled={saving}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="admin-field">
          {t("admin.newPassword")}
          <input
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            value={newPassword}
            disabled={saving}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label className="admin-field">
          {t("admin.confirmPassword")}
          <input
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            value={confirmation}
            disabled={saving}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
      </div>
      <label className="admin-password-visibility">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(event) => setShowPasswords(event.target.checked)}
        />
        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
        {t("admin.showPasswords")}
      </label>
      {error && <p className="admin-password-message error" role="alert">{error}</p>}
      {success && (
        <p className="admin-password-message success" role="status">
          <ShieldCheck size={17} />{success}
        </p>
      )}
      <div className="admin-tools-actions">
        <button
          type="submit"
          className="btn"
          disabled={saving || !currentPassword || !newPassword || !confirmation}
        >
          {saving ? t("admin.passwordChanging") : t("admin.changePassword")}
        </button>
      </div>
    </form>
  );
}
