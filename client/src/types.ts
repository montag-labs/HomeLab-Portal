export interface AppEntry {
  id: string;
  name: string;
  domain?: string;
  localIp?: string;
  iconUrl?: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  apps: AppEntry[];
}

export type ThemeMode = "light" | "dark";
export type Language = "de" | "en";

export interface GrafanaSettings {
  enabled: boolean;
  url: string;
  dashboardUid: string;
  dashboardSlug: string;
  timeRange: string;
  refreshInterval: string;
}

export interface Settings {
  language: Language;
  theme: ThemeMode;
  accentColor: string;
  grafana?: GrafanaSettings;
}

export interface PortalConfig {
  settings: Settings;
  categories: Category[];
}
