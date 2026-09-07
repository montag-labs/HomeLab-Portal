import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const id = z.string().uuid();
const rectangle = { x: z.number().int().min(0).max(11), y: z.number().int().min(0).max(10000), w: z.number().int().min(1).max(12), h: z.number().int().min(1).max(100) };
export const deviceSchema = z.object({
  id, name: z.string().trim().min(1).max(120),
  url: z.string().max(2048).url().refine(value => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }, "HTTP/HTTPS without credentials required"),
  ip: z.string().max(253).optional(), mac: z.string().max(32).optional(),
  manufacturer: z.string().max(100).optional(), type: z.string().max(100).optional(),
  source: z.enum(["manual", "network", "fritzbox"]),
  icon: z.enum(["device", "light", "camera", "plug", "router", "sensor"]).default("device"),
});
export const dashboardSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(),
  devices: z.array(deviceSchema).max(500),
  groups: z.array(z.object({ id, name: z.string().trim().min(1).max(100), ...rectangle })).max(100),
  tiles: z.array(z.object({ id, deviceId: id, groupId: id.nullable(), ...rectangle })).max(500),
}).superRefine((data, ctx) => {
  const devices = new Set(data.devices.map(item => item.id));
  const groups = new Set(data.groups.map(item => item.id));
  const allIds = [...data.devices, ...data.groups, ...data.tiles].map(item => item.id);
  if (new Set(allIds).size !== allIds.length) ctx.addIssue({ code: "custom", message: "Duplicate IDs" });
  if (new Set(data.tiles.map(item => item.deviceId)).size !== data.tiles.length) ctx.addIssue({ code: "custom", message: "Device already placed" });
  for (const item of [...data.groups, ...data.tiles]) {
    if (item.x + item.w > 12) ctx.addIssue({ code: "custom", message: "Item outside grid" });
    if (item.y + item.h > 10000) ctx.addIssue({ code: "custom", message: "Item outside vertical grid" });
  }
  for (const tile of data.tiles) {
    if (!devices.has(tile.deviceId) || (tile.groupId !== null && !groups.has(tile.groupId))) ctx.addIssue({ code: "custom", message: "Unknown device or group" });
  }
});
export type DeviceDashboard = z.infer<typeof dashboardSchema>;
export type Device = z.infer<typeof deviceSchema>;
export const emptyDashboard = (): DeviceDashboard => ({ schemaVersion: 1, revision: 0, devices: [], groups: [], tiles: [] });
const defaultFile = fileURLToPath(new URL("../../data/devices-dashboard.json", import.meta.url));

export function createDashboardStore(filename = defaultFile) {
  let queue: Promise<unknown> = Promise.resolve();
  async function read(): Promise<DeviceDashboard> {
    try { return dashboardSchema.parse(JSON.parse(await fs.readFile(filename, "utf8"))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDashboard();
      throw error;
    }
  }
  function save(input: DeviceDashboard) {
    const task = queue.then(async () => {
      const parsed = dashboardSchema.parse(input);
      const current = await read();
      if (parsed.revision !== current.revision) return null;
      const next = { ...parsed, revision: current.revision + 1 };
      await fs.mkdir(path.dirname(filename), { recursive: true });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
        await fs.rename(temporary, filename);
      } finally { await fs.rm(temporary, { force: true }); }
      return next;
    });
    queue = task.catch(() => undefined);
    return task;
  }
  return { read, save };
}
export const dashboardStore = createDashboardStore();

export function publicDashboard(data: DeviceDashboard) {
  const placed = new Set(data.tiles.map(tile => tile.deviceId));
  return { ...data, devices: data.devices.filter(device => placed.has(device.id)).map(({ mac: _mac, manufacturer: _manufacturer, type: _type, source: _source, ...device }) => device) };
}
