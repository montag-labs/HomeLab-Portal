import type { DashboardProvider, DashboardSettings, Settings, ThemeMode } from "./types";

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  enabled: false,
  provider: "grafana",
  title: "Grafana",
  url: "",
  dashboardUid: "",
  dashboardSlug: "",
  timeRange: "now-6h",
  refreshInterval: "",
};

export const DASHBOARD_PROVIDERS: DashboardProvider[] = [
  "grafana",
  "netdata",
  "uptime-kuma",
  "custom",
];

export function resolveDashboardSettings(settings?: Settings): DashboardSettings {
  if (settings?.dashboard) {
    return { ...DEFAULT_DASHBOARD_SETTINGS, ...settings.dashboard };
  }
  if (settings?.grafana) {
    return {
      ...DEFAULT_DASHBOARD_SETTINGS,
      ...settings.grafana,
      provider: "grafana",
      title: "Grafana",
    };
  }
  return DEFAULT_DASHBOARD_SETTINGS;
}

export function buildDashboardUrl(settings: DashboardSettings, theme: ThemeMode): string {
  const url = new URL(settings.url);

  if (settings.provider === "grafana") {
    const hasDashboardPath = /\/d(?:-solo)?\//.test(url.pathname);
    if (settings.dashboardUid && !hasDashboardPath) {
      const basePath = url.pathname.replace(/\/$/, "");
      url.pathname = `${basePath}/d/${encodeURIComponent(settings.dashboardUid)}/${encodeURIComponent(settings.dashboardSlug)}`;
    }

    url.searchParams.set("from", settings.timeRange);
    url.searchParams.set("to", "now");
    if (settings.refreshInterval) {
      url.searchParams.set("refresh", settings.refreshInterval);
    } else {
      url.searchParams.delete("refresh");
    }
    url.searchParams.set("kiosk", "1");
    url.searchParams.set("theme", theme);
  }

  return url.toString();
}
