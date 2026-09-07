import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Camera,
  Check,
  CircuitBoard,
  Download,
  Lightbulb,
  Monitor,
  Pencil,
  Plug,
  Plus,
  Radio,
  RefreshCw,
  Router,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../../api";
import { safeDeviceUrl, sameDevice } from "../../devices/types";
import type { Device, DeviceDashboard, DeviceGroup, DeviceIcon, ScanJob } from "../../devices/types";

const ICONS: Record<DeviceIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  device: Monitor,
  light: Lightbulb,
  camera: Camera,
  plug: Plug,
  router: Router,
  sensor: Radio,
};

const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
      );

export function DeviceManager() {
  const { t } = useTranslation();
  const [data, setData] = useState<DeviceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Scan state
  const [scanSource, setScanSource] = useState<"network" | "fritzbox">("network");
  const [selectedSubnet, setSelectedSubnet] = useState("");
  const [portsInput, setPortsInput] = useState("80,443");
  const [fritzIp, setFritzIp] = useState("192.168.178.1");
  const [availableSubnets, setAvailableSubnets] = useState<string[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanJob | null>(null);

  // Device Form state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceUrl, setDeviceUrl] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [deviceIcon, setDeviceIcon] = useState<DeviceIcon>("device");
  const [deviceGroupId, setDeviceGroupId] = useState<string>("");

  // Group Form state
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  // Filter state
  const [searchFilter, setSearchFilter] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [inventory, scanOptions] = await Promise.all([
        api.getDeviceInventory(),
        api.getDeviceScanOptions().catch(() => ({ subnets: [], maxAddresses: 256, maxDurationSeconds: 120 })),
      ]);
      setData(inventory);
      setAvailableSubnets(scanOptions.subnets);
      if (scanOptions.subnets.length > 0 && !selectedSubnet) {
        setSelectedSubnet(scanOptions.subnets[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.deviceLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll scan progress
  useEffect(() => {
    if (!currentScan || currentScan.state !== "running") return;
    let stopped = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.getDeviceScan(currentScan.id);
        if (!stopped) setCurrentScan(result);
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : t("devices.scanFailed"));
          setCurrentScan((curr) => (curr ? { ...curr, state: "failed" } : curr));
        }
      }
    }, 1200);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [currentScan]);

  const persist = async (nextData: DeviceDashboard) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await api.saveDeviceDashboard(nextData);
      setData(updated);
      setNotice(t("devices.saved"));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.deviceSaveError"));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // --- Scan actions ---
  const startScan = async () => {
    setError("");
    setNotice("");
    try {
      if (scanSource === "network") {
        const portNumbers = portsInput
          .split(",")
          .map((p) => Number.parseInt(p.trim(), 10))
          .filter((p) => !Number.isNaN(p) && p > 0 && p <= 65535);

        if (portNumbers.length === 0) {
          setError(t("devices.invalidPorts"));
          return;
        }
        const job = await api.startDeviceScan({
          source: "network",
          subnet: selectedSubnet,
          ports: portNumbers,
        });
        setCurrentScan(job);
      } else {
        if (!fritzIp.trim()) {
          setError(t("devices.fritzIpRequired"));
          return;
        }
        const job = await api.startDeviceScan({
          source: "fritzbox",
          address: fritzIp.trim(),
        });
        setCurrentScan(job);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("devices.scanFailed"));
    }
  };

  const cancelScan = async () => {
    if (!currentScan) return;
    try {
      const cancelled = await api.cancelDeviceScan(currentScan.id);
      setCurrentScan(cancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Abbrechen");
    }
  };

  // --- Device operations ---
  const resetDeviceForm = () => {
    setEditingDeviceId(null);
    setDeviceName("");
    setDeviceUrl("");
    setDeviceIp("");
    setDeviceIcon("device");
    setDeviceGroupId("");
  };

  const startEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setDeviceName(device.name);
    setDeviceUrl(device.url);
    setDeviceIp(device.ip || "");
    setDeviceIcon(device.icon || "device");

    const tile = data?.tiles.find((t) => t.deviceId === device.id);
    setDeviceGroupId(tile?.groupId || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDevice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!data) return;
    if (!deviceName.trim()) {
      setError(t("devices.nameRequired"));
      return;
    }

    let validUrl = "";
    try {
      validUrl = safeDeviceUrl(deviceUrl.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("devices.invalidUrl"));
      return;
    }

    const devicePayload: Device = {
      id: editingDeviceId || newId(),
      name: deviceName.trim(),
      url: validUrl,
      ip: deviceIp.trim() || undefined,
      icon: deviceIcon,
      source: "manual",
    };

    // Duplicate check
    const duplicate = data.devices.some(
      (d) => d.id !== editingDeviceId && sameDevice(d, devicePayload),
    );
    if (duplicate) {
      setError(t("devices.duplicate"));
      return;
    }

    const targetGroupId = data.groups.some((g) => g.id === deviceGroupId) ? deviceGroupId : null;

    if (editingDeviceId) {
      // Update existing device
      const updatedDevices = data.devices.map((d) => (d.id === editingDeviceId ? { ...d, ...devicePayload } : d));
      let updatedTiles = [...data.tiles];
      const existingTileIndex = updatedTiles.findIndex((t) => t.deviceId === editingDeviceId);

      if (existingTileIndex >= 0) {
        updatedTiles[existingTileIndex] = {
          ...updatedTiles[existingTileIndex],
          groupId: targetGroupId,
        };
      } else {
        updatedTiles.push({
          id: newId(),
          deviceId: editingDeviceId,
          groupId: targetGroupId,
          x: 0,
          y: 0,
          w: 4,
          h: 3,
        });
      }

      await persist({ ...data, devices: updatedDevices, tiles: updatedTiles });
    } else {
      // Create new device
      const newTile = {
        id: newId(),
        deviceId: devicePayload.id,
        groupId: targetGroupId,
        x: 0,
        y: 0,
        w: 4,
        h: 3,
      };
      await persist({
        ...data,
        devices: [...data.devices, devicePayload],
        tiles: [...data.tiles, newTile],
      });
    }

    resetDeviceForm();
  };

  const deleteDevice = async (deviceId: string) => {
    if (!data) return;
    if (!window.confirm(t("devices.deleteConfirm"))) return;

    const updatedDevices = data.devices.filter((d) => d.id !== deviceId);
    const updatedTiles = data.tiles.filter((t) => t.deviceId !== deviceId);
    await persist({ ...data, devices: updatedDevices, tiles: updatedTiles });
    if (editingDeviceId === deviceId) resetDeviceForm();
  };

  const addDiscoveredDevice = async (scanned: Device) => {
    if (!data) return;
    if (data.devices.some((d) => sameDevice(d, scanned))) {
      setError(t("devices.duplicate"));
      return;
    }

    const newDevice: Device = {
      ...scanned,
      id: newId(),
    };
    const newTile = {
      id: newId(),
      deviceId: newDevice.id,
      groupId: null,
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    };

    await persist({
      ...data,
      devices: [...data.devices, newDevice],
      tiles: [...data.tiles, newTile],
    });
  };

  // --- Group operations ---
  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !newGroupName.trim()) return;

    const group: DeviceGroup = {
      id: newId(),
      name: newGroupName.trim(),
      x: 0,
      y: 0,
      w: 12,
      h: 6,
    };

    await persist({
      ...data,
      groups: [...data.groups, group],
    });
    setNewGroupName("");
  };

  const updateGroup = async (groupId: string) => {
    if (!data || !editingGroupName.trim()) return;
    const updatedGroups = data.groups.map((g) =>
      g.id === groupId ? { ...g, name: editingGroupName.trim() } : g,
    );
    await persist({ ...data, groups: updatedGroups });
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const deleteGroup = async (groupId: string) => {
    if (!data) return;
    if (!window.confirm(t("devices.removeGroupConfirm"))) return;

    // Moving tiles to ungrouped
    const updatedTiles = data.tiles.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t));
    const updatedGroups = data.groups.filter((g) => g.id !== groupId);

    await persist({
      ...data,
      groups: updatedGroups,
      tiles: updatedTiles,
    });
  };

  // --- Export / Import ---
  const exportDashboard = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homelab-devices-dashboard-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDashboard = async (file: File) => {
    if (file.size > 1024 * 1024) {
      setError(t("devices.importError"));
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = await api.validateDeviceDashboard(parsed);
      await persist(validated);
      setNotice(t("devices.imported"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("devices.importError"));
    }
  };

  if (loading) {
    return (
      <div className="admin-section">
        <div className="admin-loading">
          <RefreshCw className="spinning" size={24} />
          <span>{t("devices.loading")}</span>
        </div>
      </div>
    );
  }

  const normalizedFilter = searchFilter.trim().toLowerCase();
  const filteredDevices = (data?.devices || []).filter((d) => {
    if (!normalizedFilter) return true;
    return (
      d.name.toLowerCase().includes(normalizedFilter) ||
      (d.ip && d.ip.toLowerCase().includes(normalizedFilter)) ||
      (d.url && d.url.toLowerCase().includes(normalizedFilter)) ||
      (d.manufacturer && d.manufacturer.toLowerCase().includes(normalizedFilter)) ||
      (d.mac && d.mac.toLowerCase().includes(normalizedFilter))
    );
  });

  return (
    <div className="admin-section device-manager-section">
      {error && (
        <div className="update-error dashboard-save-message" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {notice && (
        <div className="dashboard-save-success dashboard-save-message" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}

      {/* --- Section: Network & FRITZ!Box Discovery Scan --- */}
      <section className="admin-tools-card device-scan-card">
        <div className="dashboard-section-heading">
          <div>
            <h3>{t("devices.scanSectionTitle")}</h3>
            <p>{t("devices.scanSectionDescription")}</p>
          </div>
          <span className="dashboard-provider-badge">
            <CircuitBoard size={15} />
            {t("devices.discoveryBadge")}
          </span>
        </div>

        <div className="device-scan-toolbar">
          <div className="device-scan-source-selector">
            <button
              type="button"
              className={scanSource === "network" ? "active" : ""}
              onClick={() => setScanSource("network")}
            >
              {t("devices.network")}
            </button>
            <button
              type="button"
              className={scanSource === "fritzbox" ? "active" : ""}
              onClick={() => setScanSource("fritzbox")}
            >
              {t("devices.fritz")}
            </button>
          </div>

          <div className="device-scan-header-actions">
            <button type="button" className="btn btn-secondary" onClick={exportDashboard} title={t("devices.export")}>
              <Download size={16} />
              {t("devices.export")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              title={t("devices.import")}
            >
              <Upload size={16} />
              {t("devices.import")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importDashboard(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {scanSource === "network" ? (
          <div className="dashboard-form-grid">
            <label className="admin-field">
              {t("devices.subnet")}
              {availableSubnets.length > 0 ? (
                <select
                  value={selectedSubnet}
                  disabled={currentScan?.state === "running"}
                  onChange={(e) => setSelectedSubnet(e.target.value)}
                >
                  {availableSubnets.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="192.168.1.0/24"
                  value={selectedSubnet}
                  disabled={currentScan?.state === "running"}
                  onChange={(e) => setSelectedSubnet(e.target.value)}
                />
              )}
            </label>
            <label className="admin-field">
              {t("devices.ports")}
              <input
                type="text"
                placeholder="80,443"
                value={portsInput}
                disabled={currentScan?.state === "running"}
                onChange={(e) => setPortsInput(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="dashboard-form-grid">
            <label className="admin-field">
              {t("devices.fritzIp")}
              <input
                type="text"
                placeholder="192.168.178.1"
                value={fritzIp}
                disabled={currentScan?.state === "running"}
                onChange={(e) => setFritzIp(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="device-scan-actions">
          {currentScan?.state === "running" ? (
            <button type="button" className="btn btn-danger" onClick={cancelScan}>
              <X size={16} />
              {t("devices.stop")}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={startScan}>
              <Search size={16} />
              {t("devices.start")}
            </button>
          )}
        </div>

        {currentScan && (
          <div className="device-scan-status-box">
            <div className="device-scan-status-header">
              <span className={`device-scan-state-badge state-${currentScan.state}`}>
                {currentScan.state === "running" && <RefreshCw className="spinning" size={14} />}
                {t(`devices.scanState.${currentScan.state}`)}
              </span>
              <span>
                {currentScan.checked} / {currentScan.total} {t("devices.addressesChecked")} (
                {currentScan.devices.length} {t("devices.found")})
              </span>
            </div>
            {currentScan.message && <p className="device-scan-message">{currentScan.message}</p>}

            {currentScan.devices.length > 0 && (
              <div className="device-discovered-list">
                <h4>{t("devices.discoveredDevices")}</h4>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{t("devices.name")}</th>
                        <th>{t("devices.url")}</th>
                        <th>IP</th>
                        <th>MAC / {t("devices.manufacturer")}</th>
                        <th>{t("devices.action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentScan.devices.map((scanned) => {
                        const exists = data?.devices.some((d) => sameDevice(d, scanned));
                        return (
                          <tr key={scanned.id}>
                            <td>
                              <strong>{scanned.name}</strong>
                            </td>
                            <td>
                              <a href={scanned.url} target="_blank" rel="noreferrer" className="device-link">
                                {scanned.url}
                              </a>
                            </td>
                            <td>{scanned.ip || "-"}</td>
                            <td>
                              {scanned.mac || "-"} {scanned.manufacturer ? `(${scanned.manufacturer})` : ""}
                            </td>
                            <td>
                              {exists ? (
                                <span className="device-exists-badge">{t("devices.already")}</span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-small btn-primary"
                                  onClick={() => addDiscoveredDevice(scanned)}
                                >
                                  <Plus size={14} />
                                  {t("devices.apply")}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- Section: Manual Device Form (Add / Edit) --- */}
      <section className="admin-tools-card device-form-card">
        <div className="dashboard-section-heading">
          <div>
            <h3>{editingDeviceId ? t("devices.editDevice") : t("devices.manual")}</h3>
            <p>{t("devices.manualDescription")}</p>
          </div>
          {editingDeviceId && (
            <button type="button" className="btn btn-small btn-secondary" onClick={resetDeviceForm}>
              <X size={14} />
              {t("devices.cancel")}
            </button>
          )}
        </div>

        <form onSubmit={saveDevice} className="device-manual-form">
          <div className="dashboard-form-grid">
            <label className="admin-field">
              {t("devices.name")} *
              <input
                type="text"
                required
                value={deviceName}
                placeholder="z. B. Smart Steckdose Wohnzimmer"
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </label>
            <label className="admin-field">
              {t("devices.url")} *
              <input
                type="text"
                required
                value={deviceUrl}
                placeholder="http://192.168.1.50"
                onChange={(e) => setDeviceUrl(e.target.value)}
              />
            </label>
            <label className="admin-field">
              IP ({t("devices.optional")})
              <input
                type="text"
                value={deviceIp}
                placeholder="192.168.1.50"
                onChange={(e) => setDeviceIp(e.target.value)}
              />
            </label>
            <label className="admin-field">
              {t("devices.group")}
              <select value={deviceGroupId} onChange={(e) => setDeviceGroupId(e.target.value)}>
                <option value="">{t("devices.ungrouped")}</option>
                {data?.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="device-icon-picker-section">
            <span className="admin-form-label">{t("devices.icon")}</span>
            <div className="device-icon-selector">
              {(Object.keys(ICONS) as DeviceIcon[]).map((iconKey) => {
                const IconComponent = ICONS[iconKey];
                return (
                  <button
                    key={iconKey}
                    type="button"
                    className={`device-icon-btn ${deviceIcon === iconKey ? "selected" : ""}`}
                    onClick={() => setDeviceIcon(iconKey)}
                  >
                    <IconComponent size={20} />
                    <span>{t(`devices.icons.${iconKey}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="device-form-submit-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Plus size={16} />
              {editingDeviceId ? t("devices.saveChanges") : t("devices.add")}
            </button>
            {editingDeviceId && (
              <button type="button" className="btn btn-secondary" onClick={resetDeviceForm}>
                {t("devices.cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* --- Section: Groups Management --- */}
      <section className="admin-tools-card device-groups-card">
        <div className="dashboard-section-heading">
          <div>
            <h3>{t("devices.groupsSectionTitle")}</h3>
            <p>{t("devices.groupsSectionDescription")}</p>
          </div>
        </div>

        <form onSubmit={addGroup} className="device-new-group-form">
          <input
            type="text"
            value={newGroupName}
            placeholder={t("devices.newGroupPlaceholder")}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!newGroupName.trim() || saving}>
            <Plus size={16} />
            {t("devices.newGroup")}
          </button>
        </form>

        <div className="device-groups-list">
          {data?.groups.map((group) => (
            <div key={group.id} className="device-group-item">
              {editingGroupId === group.id ? (
                <div className="device-group-edit-row">
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={() => updateGroup(group.id)}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => setEditingGroupId(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="device-group-display-row">
                  <div className="device-group-name">
                    <strong>{group.name}</strong>
                    <span className="device-group-count">
                      ({data.tiles.filter((t) => t.groupId === group.id).length} {t("devices.devices")})
                    </span>
                  </div>
                  <div className="device-group-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title={t("devices.edit")}
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setEditingGroupName(group.name);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-danger-icon"
                      title={t("devices.removeGroup")}
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {data?.groups.length === 0 && (
            <p className="device-empty-hint">{t("devices.noGroupsYet")}</p>
          )}
        </div>
      </section>

      {/* --- Section: Device Inventory --- */}
      <section className="admin-tools-card device-inventory-card">
        <div className="dashboard-section-heading">
          <div>
            <h3>{t("devices.inventory")}</h3>
            <p>{t("devices.inventoryDescription")}</p>
          </div>
          <div className="devices-search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder={t("devices.search")}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="devices-inventory-empty">
            <CircuitBoard size={32} />
            <p>{t("devices.noResults")}</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table device-inventory-table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>{t("devices.name")}</th>
                  <th>{t("devices.url")}</th>
                  <th>{t("devices.group")}</th>
                  <th>IP / MAC / {t("devices.manufacturer")}</th>
                  <th>{t("devices.source")}</th>
                  <th>{t("devices.action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const IconComp = ICONS[device.icon || "device"] || Monitor;
                  const tile = data?.tiles.find((t) => t.deviceId === device.id);
                  const group = data?.groups.find((g) => g.id === tile?.groupId);

                  return (
                    <tr key={device.id}>
                      <td className="device-icon-cell">
                        <span className="device-table-icon">
                          <IconComp size={18} />
                        </span>
                      </td>
                      <td>
                        <strong>{device.name}</strong>
                      </td>
                      <td>
                        <a href={device.url} target="_blank" rel="noreferrer" className="device-link">
                          {device.url}
                        </a>
                      </td>
                      <td>
                        <span className="device-group-badge">{group ? group.name : t("devices.ungrouped")}</span>
                      </td>
                      <td>
                        <small>
                          {device.ip && <div>IP: {device.ip}</div>}
                          {device.mac && <div>MAC: {device.mac}</div>}
                          {device.manufacturer && <div>{device.manufacturer}</div>}
                          {!device.ip && !device.mac && !device.manufacturer && "-"}
                        </small>
                      </td>
                      <td>
                        <span className="device-source-tag">
                          {device.source ? t(`devices.sources.${device.source}`) : t("devices.sources.manual")}
                        </span>
                      </td>
                      <td>
                        <div className="device-row-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            title={t("devices.edit")}
                            onClick={() => startEditDevice(device)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-danger-icon"
                            title={t("devices.deleteDevice")}
                            onClick={() => deleteDevice(device.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
