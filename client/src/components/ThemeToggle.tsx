import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useConfig } from "../hooks/useConfig";

export function ThemeToggle() {
  const { config, refresh } = useConfig();
  const { t } = useTranslation();

  if (!config) return null;

  const isDark = config.settings.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");
  const Icon = isDark ? Sun : Moon;

  const toggleTheme = async () => {
    await api.updateSettings({ ...config.settings, theme: nextTheme });
    await refresh();
  };

  return (
    <button
      type="button"
      className="theme-toggle-tile"
      onClick={() => toggleTheme().catch(() => undefined)}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle-icon"><Icon size={18} aria-hidden="true" /></span>
      <span>
        <strong>{t("theme.title")}</strong>
        <small>{isDark ? t("admin.themeDark") : t("admin.themeLight")}</small>
      </span>
    </button>
  );
}