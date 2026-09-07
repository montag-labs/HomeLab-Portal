import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  CircuitBoard,
  ExternalLink,
  Lightbulb,
  Monitor,
  Plug,
  Radio,
  RefreshCw,
  Router,
} from "lucide-react";
import { api } from "../api";
import { useReachability } from "../hooks/useReachability";
import type { Device, DeviceDashboard, DeviceIcon } from "./types";

const ICONS: Record<DeviceIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  device: Monitor,
  light: Lightbulb,
  camera: Camera,
  plug: Plug,
  router: Router,
  sensor: Radio,
};

function DeviceCard({ device }: { device: Device }) {
  const status = useReachability(device.url, device.ip);
  const IconComponent = ICONS[device.icon || "device"] || Monitor;

  const openUrl = () => {
    if (device.url) {
      window.open(device.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="app-card device-portal-card"
      role="link"
      tabIndex={0}
      onClick={openUrl}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openUrl();
      }}
    >
      <span className={`status-dot status-dot-${status}`} title={status} />
      <div className="app-card-icon device-card-icon">
        <IconComponent size={24} />
      </div>
      <div className="app-card-body">
        <div className="app-card-name">{device.name}</div>
        <a
          className="app-card-link"
          href={device.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {device.ip || device.url}
          <ExternalLink size={12} className="device-external-icon" />
        </a>
        {device.manufacturer && (
          <span className="device-card-manufacturer">{device.manufacturer}</span>
        )}
      </div>
    </div>
  );
}

export function DevicePortalView({
  preview = false,
  search = "",
}: {
  preview?: boolean;
  search?: string;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<DeviceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getDeviceDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("devices.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="portal-devices-loading">
        <RefreshCw className="spinning" size={24} />
        <span>{t("devices.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-devices-empty">
        <CircuitBoard size={32} />
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={loadData}>
          {t("devices.retry")}
        </button>
      </div>
    );
  }

  const devicesList = data?.devices ?? [];
  const groupsList = data?.groups ?? [];
  const tilesList = data?.tiles ?? [];

  if (!data || (devicesList.length === 0 && groupsList.length === 0)) {
    return (
      <div className="portal-devices-empty">
        <CircuitBoard size={36} />
        <h3>{t("devices.empty")}</h3>
        <p>{t("devices.emptyHint")}</p>
      </div>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredDevices = devicesList.filter((d) => {
    if (!normalizedSearch) return true;
    return (
      d.name?.toLowerCase().includes(normalizedSearch) ||
      (d.ip && d.ip.toLowerCase().includes(normalizedSearch)) ||
      (d.url && d.url.toLowerCase().includes(normalizedSearch)) ||
      (d.manufacturer && d.manufacturer.toLowerCase().includes(normalizedSearch))
    );
  });

  const deviceMap = new Map<string, Device>();
  for (const device of filteredDevices) {
    deviceMap.set(device.id, device);
  }

  // Find tiles belonging to each group
  const groupedSections = groupsList
    .map((group) => {
      const groupTiles = tilesList.filter((tile) => tile.groupId === group.id);
      const devices = groupTiles
        .map((tile) => deviceMap.get(tile.deviceId))
        .filter((d): d is Device => Boolean(d));
      return { group, devices };
    })
    .filter((entry) => entry.devices.length > 0 || !normalizedSearch);

  // Find ungrouped tiles/devices
  const ungroupedTiles = tilesList.filter(
    (tile) => !tile.groupId || !groupsList.some((g) => g.id === tile.groupId),
  );
  const ungroupedDevices = ungroupedTiles
    .map((tile) => deviceMap.get(tile.deviceId))
    .filter((d): d is Device => Boolean(d));

  // Also include devices that have no tiles at all if search matches
  const placedDeviceIds = new Set(tilesList.map((t) => t.deviceId));
  const unplacedDevices = filteredDevices.filter((d) => !placedDeviceIds.has(d.id));

  const allUngrouped = [...ungroupedDevices, ...unplacedDevices];

  return (
    <div className={`portal-devices-container ${preview ? "portal-devices-preview" : ""}`}>
      <div className="portal-devices-body">
        {groupedSections.map(({ group, devices }) => (
          <section key={group.id} className="category-group portal-devices-group">
            <h2 className="category-title">{group.name}</h2>
            {devices.length === 0 ? (
              <p className="portal-devices-group-empty">{t("devices.noMatchingDevicesInGroup")}</p>
            ) : (
              <div className="apps-grid portal-devices-grid">
                {devices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>
            )}
          </section>
        ))}

        {allUngrouped.length > 0 && (
          <section className="category-group portal-devices-group">
            <h2 className="category-title">{t("devices.ungrouped")}</h2>
            <div className="apps-grid portal-devices-grid">
              {allUngrouped.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          </section>
        )}

        {filteredDevices.length === 0 && normalizedSearch && (
          <div className="portal-devices-empty">
            <p>{t("devices.noResults")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
