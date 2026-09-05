import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../hooks/useConfig';

export function ThemeToggle() {
  const { config, theme, setTheme } = useConfig();
  const { t } = useTranslation();

  if (!config) return null;

  const isDark = theme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  const label = isDark ? t('theme.switchToLight') : t('theme.switchToDark');
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type='button'
      className='theme-toggle-tile'
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <span className='theme-toggle-icon'><Icon size={18} aria-hidden='true' /></span>
      <span>
        <strong>{t('theme.title')}</strong>
        <small>{isDark ? t('admin.themeDark') : t('admin.themeLight')}</small>
      </span>
    </button>
  );
}
