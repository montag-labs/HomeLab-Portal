import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

export function UpdateTokenNotice() {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getPendingUpdateToken().then((result) => {
      if (result.available && result.token) setToken(result.token);
    }).catch(() => undefined);
  }, []);

  if (!token) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      await api.confirmUpdateToken(token);
      setToken(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="update-token-modal-backdrop" role="presentation">
      <section className="update-token-modal" role="dialog" aria-modal="true" aria-labelledby="update-token-title">
        <h2 id="update-token-title">{t("updateToken.title")}</h2>
        <p>{t("updateToken.description")}</p>
        <output className="update-token-value">{token}</output>
        <label className="update-token-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {t("updateToken.confirm")}
        </label>
        <button type="button" className="btn" disabled={!confirmed || saving} onClick={confirm}>
          {t("updateToken.continue")}
        </button>
      </section>
    </div>
  );
}
