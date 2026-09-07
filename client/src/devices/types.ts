export interface Rectangle { x: number; y: number; w: number; h: number }
export type DeviceIcon = "device" | "light" | "camera" | "plug" | "router" | "sensor";
export interface Device {
  id: string; name: string; url: string; ip?: string; mac?: string; manufacturer?: string; type?: string;
  source?: "manual" | "network" | "fritzbox"; icon: DeviceIcon;
}
export interface DeviceGroup extends Rectangle { id: string; name: string }
export interface DeviceTile extends Rectangle { id: string; deviceId: string; groupId: string | null }
export interface DeviceDashboard { schemaVersion: 1; revision: number; devices: Device[]; groups: DeviceGroup[]; tiles: DeviceTile[] }
export interface ScanJob { id: string; source: string; state: "running" | "complete" | "cancelled" | "failed" | "unavailable"; checked: number; total: number; devices: Device[]; message?: string; startedAt: string }
export type ScanInput = { source: "network"; subnet: string; ports: number[] } | { source: "fritzbox"; address: string };
export function sameDevice(a: Device, b: Device) {
  const mac = (value?: string) => value?.replace(/[:-]/g, "").toLowerCase();
  return (a.mac && b.mac && mac(a.mac) === mac(b.mac)) || new URL(a.url).href === new URL(b.url).href;
}
export function safeDeviceUrl(value: string) {
  const url = new URL(value.includes("://") ? value : `http://${value}`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("HTTP/HTTPS ohne Zugangsdaten erforderlich / HTTP/HTTPS without credentials required");
  return url.href;
}
