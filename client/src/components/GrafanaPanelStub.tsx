import { useTranslation } from "react-i18next";

export function GrafanaPanelStub() {
  const { t } = useTranslation();

  return (
    <div className="grafana-stub">
      <h2>{t("dashboard.title")}</h2>
      <p>{t("dashboard.grafanaPlaceholder")}</p>
    </div>
  );
}
