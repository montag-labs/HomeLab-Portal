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

export interface Settings {
  language: Language;
  theme: ThemeMode;
  accentColor: string;
}

export interface PortalConfig {
  settings: Settings;
  categories: Category[];
}
