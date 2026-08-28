import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Eye, EyeOff, House, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandIdentity } from "./BrandIdentity";

export function AdminLogin() {
  const { t } = useTranslation();
  const { session, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(password);
      setError("");
    } catch {
      setError(t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="admin-login">
      <div className="admin-login-glow admin-login-glow-one" />
      <div className="admin-login-glow admin-login-glow-two" />
      <section className="admin-login-shell">
        <aside className="admin-login-hero" aria-label={t("auth.securityTitle")}>
          <div className="admin-login-brand">
            <BrandIdentity />
          </div>
          <div className="admin-login-hero-copy">
            <span className="admin-login-badge"><ShieldCheck size={15} /> {t("auth.protectedArea")}</span>
            <h1>{t("auth.welcome")}</h1>
            <p>{t("auth.welcomeDescription")}</p>
          </div>
          <div className="admin-login-security">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>{t("auth.securityTitle")}</strong>
              <span>{t("auth.securityDescription")}</span>
            </div>
          </div>
        </aside>

        <form className="admin-login-card" onSubmit={submit}>
          <div className="admin-login-form-heading">
            <span className="admin-login-lock"><LockKeyhole size={22} /></span>
            <span className="admin-login-eyebrow">{t("nav.admin")}</span>
            <h2>{t("auth.title")}</h2>
            <p>{t("auth.description")}</p>
          </div>

          {!session?.configured && (
            <div className="admin-login-alert" role="alert">
              <ShieldCheck size={18} />
              <span>{t("auth.notConfigured")}</span>
            </div>
          )}

          <label className="admin-login-field">
            <span>{t("auth.password")}</span>
            <div className="admin-login-input">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                disabled={submitting || !session?.configured}
                placeholder={t("auth.passwordPlaceholder")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="admin-login-error" role="alert">{error}</p>}

          <button className="admin-login-submit" disabled={submitting || !password || !session?.configured}>
            <span>{submitting ? t("auth.loggingIn") : t("auth.login")}</span>
            {submitting ? <span className="admin-login-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
          </button>
          <Link className="admin-login-back" to="/">
            <House size={16} />
            {t("auth.backToPortal")}
          </Link>
        </form>
      </section>
    </main>
  );
}
