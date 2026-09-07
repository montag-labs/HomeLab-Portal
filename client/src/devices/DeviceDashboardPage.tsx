import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, CircuitBoard, ExternalLink, Grip, Lightbulb, Monitor, Pencil, Plug, Plus, Radio, Router, Search, Trash2 } from "lucide-react";
import { api } from "../api";
import { Sidebar } from "../components/Sidebar";
import { ThemeToggle } from "../components/ThemeToggle";
import { BrandIdentity } from "../components/BrandIdentity";
import { ReachabilityProvider } from "../context/ReachabilityProvider";
import { DeviceGrid } from "./DeviceGrid";
import { de, en } from "./messages";
import { safeDeviceUrl, sameDevice } from "./types";
import type { Device, DeviceDashboard, DeviceIcon, Rectangle, ScanJob } from "./types";
import "./devices.css";

const icons = { device: Monitor, light: Lightbulb, camera: Camera, plug: Plug, router: Router, sensor: Radio };
const newId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, character => (Number(character) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))).toString(16));
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const bottom = (items: Rectangle[]) => items.reduce((max, item) => Math.max(max, item.y + item.h), 0);

export function DeviceDashboardPage() {
  const embedded = new URLSearchParams(window.location.search).get("embedded") === "1";
  const { i18n } = useTranslation();
  const t = i18n.language.startsWith("de") ? de : en;
  const [data, setData] = useState<DeviceDashboard | null>(null);
  const [admin, setAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState<DeviceIcon>("device");
  const [groupName, setGroupName] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [selected, setSelected] = useState("");
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [source, setSource] = useState<"network" | "fritzbox">("network");
  const [subnet, setSubnet] = useState("");
  const [ports, setPorts] = useState("80,443");
  const [fritzIp, setFritzIp] = useState("");
  const [subnets, setSubnets] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanJob | null>(null);
  const saved = useRef<DeviceDashboard | null>(null);
  const upload = useRef<HTMLInputElement>(null);

  const load = async () => {
    setBusy(true); setError("");
    try {
      const dashboard = await api.getDeviceDashboard();
      setData(dashboard); saved.current = dashboard;
      const session = await api.getAuthSession();
      setAdmin(session.authenticated && !embedded);
    } catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let active = true;
    Promise.all([api.getDeviceDashboard(), api.getAuthSession()]).then(([dashboard, session]) => {
      if (active) { setData(dashboard); saved.current = dashboard; setAdmin(session.authenticated && !embedded); }
    }).catch(reason => { if (active) setError(message(reason)); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [embedded]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing]);
  useEffect(() => {
    if (!scan || scan.state !== "running") return;
    let stopped = false;
    const timer = window.setTimeout(() => {
      api.getDeviceScan(scan.id).then(result => { if (!stopped) setScan(result); }).catch(reason => { if (!stopped) { setError(message(reason)); setScan(current => current ? { ...current, state: "failed" } : current); } });
    }, 1200);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [scan]);
  const execute = async (operation: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const beginEdit = () => execute(async () => {
    const inventory = await api.getDeviceInventory();
    const options = await api.getDeviceScanOptions();
    saved.current = inventory; setData(inventory); setEditing(true); setSearch("");
    setSubnets(options.subnets);
    if (options.subnets.length) {
      const [ip, prefix] = options.subnets[0].split("/");
      setSubnet(`${ip}/${Math.max(24, Number(prefix))}`);
    }
  });
  const save = () => execute(async () => {
    if (!data) return;
    const result = await api.saveDeviceDashboard(data);
    saved.current = result; setData(result); setEditing(false); setSelected(""); setNotice(t.saved);
  });
  const cancel = () => {
    if (!window.confirm(t.unsaved)) return;
    setData(saved.current); setEditing(false); setSelected(""); setEditingDevice(null); setError(""); setNotice("");
  };
  function changeGeometry(kind: "groups" | "tiles", changes: (Rectangle & { id: string })[]) {
    setData(current => {
      if (!current) return current;
      let changed = false;
      const items = current[kind].map(item => {
        const update = changes.find(change => change.id === item.id);
        if (!update || ["x", "y", "w", "h"].every(key => item[key as keyof Rectangle] === update[key as keyof Rectangle])) return item;
        changed = true; return { ...item, ...update };
      });
      return changed ? { ...current, [kind]: items } : current;
    });
  }
  function addDevice(device: Device) {
    if (!data) return;
    if (data.devices.some(item => sameDevice(item, device))) { setError(t.duplicate); return; }
    const groupId = data.groups.some(group => group.id === targetGroup) ? targetGroup : null;
    setData({ ...data, devices: [...data.devices, device], tiles: [...data.tiles, { id: newId(), deviceId: device.id, groupId, x: 0, y: bottom(data.tiles.filter(tile => tile.groupId === groupId)), w: 4, h: 3 }] });
    setError("");
  }
  function place(deviceId: string) {
    if (!data) return;
    const groupId = data.groups.some(group => group.id === targetGroup) ? targetGroup : null;
    setData({ ...data, tiles: [...data.tiles, { id: newId(), deviceId, groupId, x: 0, y: bottom(data.tiles.filter(tile => tile.groupId === groupId)), w: 4, h: 3 }] });
  }
  function manualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    try {
      const normalized = safeDeviceUrl(url);
      const device: Device = { id: editingDevice ?? newId(), name: name.trim(), url: normalized, ip: new URL(normalized).hostname, icon, source: "manual" };
      if (!device.name) return;
      if (data.devices.some(item => item.id !== editingDevice && sameDevice(item, device))) throw new Error(t.duplicate);
      if (editingDevice) setData({ ...data, devices: data.devices.map(item => item.id === editingDevice ? { ...item, ...device } : item) });
      else addDevice(device);
      setEditingDevice(null); setName(""); setUrl(""); setIcon("device"); setError("");
    } catch (reason) { setError(message(reason)); }
  }
  function exportData() {
    if (!data) return;
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = objectUrl; link.download = "devices-dashboard.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  const importData = (file?: File) => execute(async () => {
    if (!file || !data) return;
    if (file.size > 1000000) throw new Error(t.importError);
    let value: unknown;
    try { value = JSON.parse(await file.text()); } catch { throw new Error(t.importError); }
    const result = await api.validateDeviceDashboard(value);
    setData({ ...result, revision: data.revision }); setSelected(""); setTargetGroup(""); setNotice(t.imported);
  });
  const startScan = () => execute(async () => {
    if (source === "network") {
      const values = ports.split(",").map(value => Number(value.trim()));
      if (!values.length || values.some(value => !Number.isInteger(value) || value < 1 || value > 65535)) throw new Error(t.invalidPorts);
      setScan(await api.startDeviceScan({ source, subnet, ports: values }));
      return;
    }
    setScan(await api.startDeviceScan({ source, address: fritzIp.trim() }));
  });
  const tile = data?.tiles.find(item => item.id === selected);
  const group = data?.groups.find(item => item.id === selected);
  const geometry = tile ?? group;
  const query = search.trim().toLowerCase();
  const matches = (device: Device, groupId?: string | null) => !query || [device.name, device.ip, device.url, device.manufacturer, data?.groups.find(item => item.id === groupId)?.name].filter(Boolean).join(" ").toLowerCase().includes(query);
  const visibleTiles = data?.tiles.filter(item => { const device = data.devices.find(entry => entry.id === item.deviceId); return device && matches(device, item.groupId); }) ?? [];
  const drawTile = (id: string) => {
    const entry = data!.tiles.find(item => item.id === id)!;
    const device = data!.devices.find(item => item.id === entry.deviceId)!;
    const Icon = icons[device.icon] ?? Monitor;
    return <article className={`device-tile ${selected === id ? "device-selected" : ""}`}>
      {editing && <div className="device-tile-actions"><span className="device-tile-handle" title={t.move}><Grip size={16} /></span><button type="button" aria-label={`${t.edit} ${device.name}`} onClick={() => setSelected(id)}><Pencil size={15} /></button><button type="button" aria-label={`${t.remove} ${device.name}`} onClick={() => setData(current => current && ({ ...current, tiles: current.tiles.filter(item => item.id !== id) }))}><Trash2 size={15} /></button></div>}
      <a href={device.url} target="_blank" rel="noopener noreferrer" onClick={event => { if (editing) { event.preventDefault(); setSelected(id); } }}>
        <span className="device-icon"><Icon size={24} /></span><strong>{device.name}</strong><small>{device.ip || new URL(device.url).host}</small>{!editing && <ExternalLink className="device-external" size={14} />}
      </a>
    </article>;
  };
  const drawTiles = (groupId: string | null) => <DeviceGrid items={(editing ? data!.tiles : visibleTiles).filter(item => item.groupId === groupId)} editable={editing && !busy} onChange={changes => changeGeometry("tiles", changes)} render={drawTile} />;

  return <ReachabilityProvider><div className={embedded ? "devices-embedded" : "portal-layout"}>{!embedded && <Sidebar />}<div className={embedded ? "devices-embedded-workspace" : "portal-workspace"}>
    {!embedded && <header className="portal-header"><div className="portal-brand-card"><BrandIdentity /></div><ThemeToggle /></header>}
    <main className={`portal-main devices-page ${editing ? "devices-editing" : ""}`}>
      <header className="devices-heading"><div><span className="devices-eyebrow"><CircuitBoard size={17} /> SMART HOME</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="devices-actions">{editing ? <><button className="btn btn-primary" disabled={busy} onClick={save}>{t.save}</button><button className="btn" disabled={busy} onClick={cancel}>{t.cancel}</button></> : admin ? <button className="btn btn-primary" disabled={busy || !data} onClick={beginEdit}><Pencil size={16} /> {t.edit}</button> : <Link className="btn" to="/admin">{t.login}</Link>}</div></header>
      {error && <div className="devices-error" role="alert">{error} {!data && <button className="btn" onClick={load}>{t.retry}</button>}</div>}
      {notice && <p role="status" className="devices-notice">{notice}</p>}
      {!data ? <p>{busy ? t.loading : ""}</p> : <>
        <div className="devices-toolbar"><label className="devices-search"><Search size={18} /><input aria-label={t.search} placeholder={t.search} value={search} disabled={editing} onChange={event => setSearch(event.target.value)} /></label><span>{data.tiles.length} {t.devices} · {data.groups.length} {t.group}</span></div>
        {editing && <p className="devices-draft" role="status">{t.draft}<small>{t.publicHint}</small></p>}
        <div className="devices-body"><div className="devices-canvas">
          {editing && <p className="devices-help">{t.layoutHint}</p>}
          <p className="devices-mobile-hint">{t.mobileHint}</p>
          {!data.tiles.length && !data.groups.length && <div className="devices-empty"><CircuitBoard size={46} /><h2>{t.empty}</h2><p>{t.emptyHint}</p></div>}
          {!editing && query && !visibleTiles.length && <p>{t.noResults}</p>}
          <DeviceGrid kind="groups" items={data.groups.filter(item => editing || !query || visibleTiles.some(entry => entry.groupId === item.id))} editable={editing && !busy} onChange={changes => changeGeometry("groups", changes)} render={id => {
            const item = data.groups.find(entry => entry.id === id)!;
            return <section className={`device-group ${selected === id ? "device-selected" : ""}`}><header className="device-group-heading"><span className="device-group-handle">{editing && <Grip size={18} />}<strong>{item.name}</strong></span>{editing && <button type="button" aria-label={`${t.edit} ${item.name}`} onClick={() => setSelected(id)}><Pencil size={16} /></button>}</header><div className="device-group-body">{drawTiles(id)}</div></section>;
          }} />
          {(editing || visibleTiles.some(item => item.groupId === null)) && <section className="devices-ungrouped"><h2>{t.ungrouped}</h2>{drawTiles(null)}</section>}
        </div>
        {editing && <aside className="devices-editor" aria-label={t.edit}>
          <fieldset disabled={busy}>
          {geometry && <section className="devices-editor-section"><h2>{t.geometry}</h2>
            {group && <label>{t.groupName}<input maxLength={100} value={group.name} onChange={event => setData({ ...data, groups: data.groups.map(item => item.id === group.id ? { ...item, name: event.target.value } : item) })} /></label>}
            {tile && <label>{t.group}<select value={tile.groupId ?? ""} onChange={event => { const groupId = event.target.value || null; setData({ ...data, tiles: data.tiles.map(item => item.id === tile.id ? { ...item, groupId, x: 0, y: bottom(data.tiles.filter(other => other.groupId === groupId && other.id !== item.id)) } : item) }); }}><option value="">{t.ungrouped}</option>{data.groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <div className="devices-geometry">{(["x", "y", "w", "h"] as const).map(key => <label key={key}>{t[key]}<input type="number" min={key === "w" || key === "h" ? 1 : 0} max={key === "y" ? 10000 : key === "h" ? 100 : key === "x" ? 11 : 12} value={geometry[key]} onChange={event => { const value = Number(event.target.value); const next = { ...geometry, [key]: Math.max(key === "w" || key === "h" ? 1 : 0, Math.min(key === "y" ? 10000 : key === "h" ? 100 : key === "x" ? 11 : 12, value)) }; if (next.x + next.w > 12) next.x = 12 - next.w; if (next.y + next.h > 10000) next.y = 10000 - next.h; changeGeometry(tile ? "tiles" : "groups", [next]); }} /></label>)}</div>
            {group && <button className="btn" onClick={() => { let nextY = bottom(data.tiles.filter(item => item.groupId === null)); setData({ ...data, groups: data.groups.filter(item => item.id !== group.id), tiles: data.tiles.map(item => { if (item.groupId !== group.id) return item; const next = { ...item, groupId: null, x: 0, y: nextY }; nextY += item.h; return next; }) }); if (targetGroup === group.id) setTargetGroup(""); setSelected(""); }}>{t.removeGroup}</button>}
          </section>}
          <section className="devices-editor-section"><form onSubmit={event => { event.preventDefault(); if (!groupName.trim()) return; const id = newId(); setData({ ...data, groups: [...data.groups, { id, name: groupName.trim(), x: 0, y: bottom(data.groups), w: 12, h: 4 }] }); setGroupName(""); setTargetGroup(id); }}><h2>{t.newGroup}</h2><label>{t.groupName}<input required maxLength={100} value={groupName} onChange={event => setGroupName(event.target.value)} /></label><button className="btn" type="submit"><Plus size={16} />{t.add}</button></form></section>
          <section className="devices-editor-section"><label>{t.selection}<select value={targetGroup} onChange={event => setTargetGroup(event.target.value)}><option value="">{t.ungrouped}</option>{data.groups.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><form onSubmit={manualSubmit}><h2>{editingDevice ? t.editDevice : t.manual}</h2><label>{t.name}<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><label>{t.url}<input required maxLength={2048} placeholder="http://192.168.178.20" value={url} onChange={event => setUrl(event.target.value)} /></label><label>{t.icon}<select value={icon} onChange={event => setIcon(event.target.value as DeviceIcon)}>{Object.keys(icons).map(value => <option key={value} value={value}>{t[value as DeviceIcon]}</option>)}</select></label><button className="btn" type="submit">{editingDevice ? t.apply : t.add}</button>{editingDevice && <button className="btn" type="button" onClick={() => { setEditingDevice(null); setName(""); setUrl(""); }}>{t.cancel}</button>}</form></section>
          <section className="devices-editor-section"><h2>{t.inventory}</h2><div className="devices-inventory">{data.devices.map(device => <div key={device.id}><span><strong>{device.name}</strong><small>{device.ip || device.url}</small></span><div className="devices-actions"><button title={t.editDevice} aria-label={`${t.editDevice} ${device.name}`} onClick={() => { setEditingDevice(device.id); setName(device.name); setUrl(device.url); setIcon(device.icon); }}><Pencil size={14} /></button>{data.tiles.some(item => item.deviceId === device.id) ? <small>{t.placed}</small> : <button onClick={() => place(device.id)}>{t.place}</button>}<button title={t.deleteDevice} aria-label={`${t.deleteDevice} ${device.name}`} onClick={() => { setData({ ...data, devices: data.devices.filter(item => item.id !== device.id), tiles: data.tiles.filter(item => item.deviceId !== device.id) }); if (editingDevice === device.id) { setEditingDevice(null); setName(""); setUrl(""); } }}><Trash2 size={14} /></button></div></div>)}</div></section>
          <section className="devices-editor-section"><h2>{t.scan}</h2><p>{t.scanHint}</p><p><strong>{t.approved}:</strong> {subnets.join(", ") || t.noNetworks}</p><label>{t.scan}<select value={source} disabled={scan?.state === "running"} onChange={event => setSource(event.target.value as typeof source)}><option value="network">{t.network}</option><option value="fritzbox">{t.fritz}</option></select></label>{source === "network" ? <><label>{t.subnet}<input value={subnet} onChange={event => setSubnet(event.target.value)} placeholder="192.168.178.0/24" /></label><label>{t.ports}<input value={ports} onChange={event => setPorts(event.target.value)} /></label></> : <label>{t.fritzIp}<input value={fritzIp} onChange={event => setFritzIp(event.target.value)} placeholder="192.168.178.1" /></label>}
            {scan?.state === "running" ? <button className="btn" onClick={() => execute(async () => setScan(await api.cancelDeviceScan(scan.id)))}>{t.stop}</button> : <button className="btn" disabled={source === "network" && !subnets.length} onClick={startScan}>{t.start}</button>}
            {scan && <div className="devices-scan-status" role="status"><strong>{t[scan.state]} · {scan.checked}/{scan.total}</strong><progress max={scan.total || 1} value={scan.checked} />{scan.message && <p>{scan.message}</p>}</div>}
          </section>
          <section className="devices-editor-section devices-actions"><button className="btn" onClick={exportData}>{t.export}</button><button className="btn" onClick={() => upload.current?.click()}>{t.import}</button><input ref={upload} type="file" accept="application/json,.json" hidden onChange={event => { void importData(event.target.files?.[0]); event.target.value = ""; }} /></section>
          </fieldset>
        </aside>}
        </div>
        {editing && scan && <section className="devices-results"><h2>{t.results} ({scan.devices.length})</h2>{!scan.devices.length ? <p>{t.scanEmpty}</p> : <div className="devices-table-wrap"><table><thead><tr><th>{t.name}</th><th>IP</th><th>MAC</th><th>{i18n.language.startsWith("de") ? "Hersteller / Typ" : "Manufacturer / type"}</th><th>{t.add}</th></tr></thead><tbody>{scan.devices.map(device => { const exists = data.devices.some(item => sameDevice(item, device)); return <tr key={device.id}><td>{device.name}</td><td>{device.ip}</td><td>{device.mac || "—"}</td><td>{[device.manufacturer, device.type].filter(Boolean).join(" / ") || "—"}</td><td><button className="btn" disabled={busy || exists} onClick={() => addDevice(device)}>{exists ? t.already : t.add}</button></td></tr>; })}</tbody></table></div>}</section>}
      </>}
    </main>
  </div></div></ReachabilityProvider>;
}
