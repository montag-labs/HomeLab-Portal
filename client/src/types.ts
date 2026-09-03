export interface AppEntry {
  id: string;
  name: string;
  domain?: string;
  localIp?: string;
  iconUrl?: string;
  iconKey?: string;
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

export type LogRotation = "day" | "week" | "month" | "year";

export interface LogPolicy {
  rotation: LogRotation;
  archiveCount: number;
}

export interface GrafanaSettings {
  enabled: boolean;
  url: string;
  dashboardUid: string;
  dashboardSlug: string;
  timeRange: string;
  refreshInterval: string;
}

export type DashboardProvider = "grafana" | "netdata" | "uptime-kuma" | "custom";

export interface DashboardSettings extends GrafanaSettings {
  provider: DashboardProvider;
  title: string;
}

export interface Settings {
  language: Language;
  theme: ThemeMode;
  accentColor: string;
  logPolicy?: LogPolicy;
  dashboard?: DashboardSettings;
  /** Legacy configuration, migrated to dashboard when it is read. */
  grafana?: GrafanaSettings;
}

export interface LogArchive {
  id: string;
  fileName: string;
  size: number;
  modifiedAt: string;
}

export interface LogSource {
  id: string;
  label: string;
  available: boolean;
  size: number;
  modifiedAt?: string;
  archives: LogArchive[];
}

export interface LogContent {
  id: string;
  content: string;
  truncated: boolean;
}

export interface PortalConfig {
  settings: Settings;
  categories: Category[];
}

export interface ReachabilityDetails {
  online: boolean;
  method?: "HEAD" | "GET";
  statusCode?: number;
  error?: string;
}

export interface ReachabilitySnapshot {
  checkedAt: string;
  results: Record<string, ReachabilityDetails>;
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

export interface AuthSession {
  configured: boolean;
  passwordEnabled?: boolean;
  ssoEnabled?: boolean;
  ssoLabel?: string;
  authenticated: boolean;
  authMethod?: "password" | "oidc";
  displayName?: string;
  csrfToken?: string;
}

export type OidcClientAuthMethod = "client_secret_post" | "client_secret_basic" | "none";

export interface OidcAdminConfig {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  allowedGroups: string[];
  groupsClaim: string;
  scopes: string;
  displayName: string;
  clientAuthMethod: OidcClientAuthMethod;
  disablePasswordLogin: boolean;
  clientSecretConfigured: boolean;
  lastVerifiedAt?: string;
  managedByEnvironment: boolean;
}

export interface OidcAdminConfigInput extends Omit<
  OidcAdminConfig,
  "clientSecretConfigured" | "lastVerifiedAt" | "managedByEnvironment"
> {
  clientSecret?: string;
  clearClientSecret?: boolean;
}
