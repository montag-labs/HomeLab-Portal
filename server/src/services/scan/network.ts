import { Resolver } from "node:dns/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Device } from "../deviceDashboard.js";
import { probe } from "./probe.js";

const exec = promisify(execFile);

async function hostname(ip: string, signal: AbortSignal): Promise<string> {
  const resolver = new Resolver({ timeout: 700, tries: 1 });
  const cancel = () => resolver.cancel();
  if (signal.aborted) return "";
  signal.addEventListener("abort", cancel, { once: true });
  try {
    return (await resolver.reverse(ip))[0] ?? "";
  } catch {
    return "";
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

/** Adds MAC addresses (and optional vendor names) from the OS neighbor table. */
export async function enrichNeighbors(devices: Device[]): Promise<void> {
  try {
    const result = process.platform === "win32"
      ? await exec("arp", ["-a"], { timeout: 2000, windowsHide: true, maxBuffer: 262144 })
      : await exec("ip", ["neigh", "show"], { timeout: 2000, maxBuffer: 262144 });
    let vendors: Record<string, string> = {};
    if (process.env.DEVICE_VENDOR_FILE) {
      try {
        vendors = JSON.parse(await readFile(process.env.DEVICE_VENDOR_FILE, "utf8"));
      } catch { /* Optional offline lookup. */ }
    }
    const lines = result.stdout.split(/\r?\n/);
    for (const device of devices) {
      const line = lines.find((value) => value.trim().split(/\s+/)[0] === device.ip);
      const mac = line?.match(/\b(?:[\da-f]{2}[:-]){5}[\da-f]{2}\b/i)?.[0].replaceAll("-", ":").toUpperCase();
      if (!mac || mac === "00:00:00:00:00:00" || mac === "FF:FF:FF:FF:FF:FF") continue;
      device.mac = mac;
      const vendor = vendors[mac.replaceAll(":", "").slice(0, 6)];
      if (!device.manufacturer && typeof vendor === "string") device.manufacturer = vendor.slice(0, 100);
    }
  } catch { /* Neighbor discovery never requires additional privileges. */ }
}

async function readShellyDetails(url: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const shelly = await probe(`${url}/shelly`, signal);
  try {
    const parsed: unknown = shelly?.status === 200 ? JSON.parse(shelly.body) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch { /* Not a Shelly. */ }
  return {};
}

/** Returns the first responding HTTP(S) service of an address as a device, or null. */
export async function discover(ip: string, ports: number[], signal: AbortSignal): Promise<Device | null> {
  for (const port of ports) {
    for (const protocol of port === 443 || port === 8443 ? ["https", "http"] : ["http", "https"]) {
      if (signal.aborted) return null;
      const url = `${protocol}://${ip}:${port}`;
      const result = await probe(url, signal, "HEAD");
      if (!result || result.status < 100) continue;
      const details = await readShellyDetails(url, signal);
      const isShelly = (typeof details.type === "string" && typeof details.mac === "string")
        || (typeof details.id === "string" && details.id.startsWith("shelly"));
      const name = await hostname(ip, signal);
      const fallbackName = typeof details.name === "string" ? details.name : "";
      return {
        id: randomUUID(),
        name: (name || fallbackName || `Gerät ${ip}`).slice(0, 120),
        url: new URL(url).href,
        ip,
        source: "network",
        icon: "device",
        ...(isShelly ? { manufacturer: "Shelly", type: String(details.model ?? details.type ?? "Shelly").slice(0, 100) } : {}),
      };
    }
  }
  return null;
}
