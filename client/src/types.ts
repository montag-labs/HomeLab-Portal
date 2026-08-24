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

export type UpdateState = "current" | "available" | "updating" | "failed";
export type UpdateMode = "lxc" | "docker" | "unsupported";

export interface UpdateStatus {
  state: UpdateState;
  installedVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  releaseName?: string;
  checkedAt: string;
  capabilities: {
    mode: UpdateMode;
    canUpdate: boolean;
    reason: string;
  };
  error?: string;
}

export interface UpdateStartResult {
  state: "updating" | "rejected";
  message: string;
}

export interface PendingUpdateToken {
  available: boolean;
  token?: string;
}
