import { setMaxListeners } from "node:events";
import http from "node:http";
import https from "node:https";
import { networkInterfaces } from "node:os";
import { Resolver } from "node:dns/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Device } from "./deviceDashboard.js";

const exec = promisify(execFile);
export function ipv4(value: string): number | null {
  if (!/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  if (parts.some(part => part > 255)) return null;
  return parts.reduce((sum, part) => sum * 256 + part, 0);
}
const address = (value: number) => [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join(".");
export function privateIp(value: number): boolean {
  return Math.floor(value / 16777216) === 10 || Math.floor(value / 1048576) === 2753 || Math.floor(value / 65536) === 49320;
}
export function parseSubnet(value: string) {
  const match = /^(.*)\/(\d{1,2})$/.exec(value);
  if (!match) throw new Error("Ungültiges IPv4-Subnetz");
  const ip = ipv4(match[1]);
  const prefix = Number(match[2]);
  if (ip === null || prefix < 8 || prefix > 32) throw new Error("Ungültiges IPv4-Subnetz");
  const size = 2 ** (32 - prefix);
  const start = Math.floor(ip / size) * size;
  if (!privateIp(start) || !privateIp(start + size - 1)) throw new Error("Nur private IPv4-Netze sind erlaubt");
  return { start, end: start + size - 1, size, prefix, cidr: `${address(start)}/${prefix}` };
}
export function allowedSubnets(): string[] {
  const configured = process.env.DEVICE_SCAN_SUBNETS;
  if (configured !== undefined) return configured.split(",").map(item => item.trim()).filter(Boolean).map(item => parseSubnet(item).cidr);
  return [...new Set(Object.values(networkInterfaces()).flatMap(entries => entries ?? []).filter(item => item.family === "IPv4" && !item.internal && item.cidr && privateIp(ipv4(item.address) ?? 0)).map(item => parseSubnet(item.cidr!).cidr))];
}
export function scanAddresses(cidr: string, allowed = allowedSubnets()): string[] {
  const subnet = parseSubnet(cidr);
  if (subnet.size > 256) throw new Error("Maximal 256 Adressen pro Scan (/24 oder kleiner)");
  if (!allowed.some(value => { const parent = parseSubnet(value); return subnet.start >= parent.start && subnet.end <= parent.end; })) throw new Error("Subnetz ist nicht für Scans freigegeben");
  const skip = subnet.prefix <= 30 ? 1 : 0;
  return Array.from({ length: subnet.size - skip * 2 }, (_, index) => address(subnet.start + skip + index));
}
export const scanInputSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("network"), subnet: z.string().max(32), ports: z.array(z.number().int().min(1).max(65535)).min(1).max(8).default([80, 443]) }),
  z.object({ source: z.literal("fritzbox"), address: z.string().max(32) }),
]);
type ScanInput = z.infer<typeof scanInputSchema>;
export interface ScanJob { id: string; source: string; state: "running" | "complete" | "cancelled" | "failed" | "unavailable"; checked: number; total: number; devices: Device[]; message?: string; startedAt: string }
interface HttpResult { status: number; body: string }
// Only validated numeric destinations are passed by scan workers. Never follow redirects.
export function probe(url: string, signal: AbortSignal, method = "GET", body?: string, soapAction?: string): Promise<HttpResult | null> {
  return new Promise(resolve => {
    let done = false;
    const finish = (result: HttpResult | null) => { if (!done) { done = true; clearTimeout(timer); resolve(result); } };
    const client = url.startsWith("https:") ? https : http;
    const request = client.request(url, { method, signal, headers: body ? { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${soapAction}"` } : {}, rejectUnauthorized: true }, response => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        text += chunk;
        if (text.length > 65536) { finish({ status: response.statusCode ?? 0, body: "" }); request.destroy(); }
      });
      response.on("end", () => finish({ status: response.statusCode ?? 0, body: text }));
      response.on("error", () => finish(null));
    });
    const timer = setTimeout(() => { finish(null); request.destroy(); }, 1800);
    request.on("error", () => finish(null));
    request.end(body);
  });
}
async function hostname(ip: string, signal: AbortSignal) {
  const resolver = new Resolver({ timeout: 700, tries: 1 });
  const cancel = () => resolver.cancel();
  if (signal.aborted) return "";
  signal.addEventListener("abort", cancel, { once: true });
  try { return (await resolver.reverse(ip))[0] ?? ""; } catch { return ""; }
  finally { signal.removeEventListener("abort", cancel); }
}
async function enrichNeighbors(devices: Device[]) {
  try {
    const result = process.platform === "win32" ? await exec("arp", ["-a"], { timeout: 2000, windowsHide: true, maxBuffer: 262144 }) : await exec("ip", ["neigh", "show"], { timeout: 2000, maxBuffer: 262144 });
    let vendors: Record<string, string> = {};
    if (process.env.DEVICE_VENDOR_FILE) {
      try { vendors = JSON.parse(await readFile(process.env.DEVICE_VENDOR_FILE, "utf8")); } catch { /* Optional offline lookup. */ }
    }
    for (const device of devices) {
      const line = result.stdout.split(/\r?\n/).find(value => value.trim().split(/\s+/)[0] === device.ip);
      const mac = line?.match(/\b(?:[\da-f]{2}[:-]){5}[\da-f]{2}\b/i)?.[0].replaceAll("-", ":").toUpperCase();
      if (mac && mac !== "00:00:00:00:00:00" && mac !== "FF:FF:FF:FF:FF:FF") {
        device.mac = mac;
        const vendor = vendors[mac.replaceAll(":", "").slice(0, 6)];
        if (!device.manufacturer && typeof vendor === "string") device.manufacturer = vendor.slice(0, 100);
      }
    }
  } catch { /* Neighbor discovery never requires additional privileges. */ }
}
async function discover(ip: string, ports: number[], signal: AbortSignal): Promise<Device | null> {
  for (const port of ports) {
    for (const protocol of port === 443 || port === 8443 ? ["https", "http"] : ["http", "https"]) {
      if (signal.aborted) return null;
      const url = `${protocol}://${ip}:${port}`;
      const result = await probe(url, signal, "HEAD");
      if (!result || result.status < 100) continue;
      const shelly = await probe(`${url}/shelly`, signal);
      let details: Record<string, unknown> = {};
      try {
        const parsed: unknown = shelly?.status === 200 ? JSON.parse(shelly.body) : null;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) details = parsed as Record<string, unknown>;
      } catch { /* Not a Shelly. */ }
      const isShelly = (typeof details.type === "string" && typeof details.mac === "string") || (typeof details.id === "string" && details.id.startsWith("shelly"));
      const name = await hostname(ip, signal);
      return { id: randomUUID(), name: (name || (typeof details.name === "string" ? details.name : "") || `Gerät ${ip}`).slice(0, 120), url: new URL(url).href, ip, source: "network", icon: "device", ...(isShelly ? { manufacturer: "Shelly", type: String(details.model ?? details.type ?? "Shelly").slice(0, 100) } : {}) };
    }
  }
  return null;
}
const jobs = new Map<string, { job: ScanJob; controller: AbortController }>();
let lastStart = 0;
export function getScan(id: string) { return jobs.get(id)?.job; }
export function cancelScan(id: string) {
  const entry = jobs.get(id);
  if (!entry) return undefined;
  if (entry.job.state === "running") { entry.job.state = "cancelled"; entry.controller.abort(); }
  return entry.job;
}
const xmlValue = (xml: string, name: string) => new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(xml)?.[1]?.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"') ?? "";
async function fritzbox(ip: string, job: ScanJob, signal: AbortSignal) {
  const service = "urn:dslforum-org:service:Hosts:1";
  const call = (action: string, content = "") => probe(`http://${ip}:49000/upnp/control/hosts`, signal, "POST", `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action} xmlns:u="${service}">${content}</u:${action}></s:Body></s:Envelope>`, `${service}#${action}`);
  const countResult = await call("GetHostNumberOfEntries");
  const countText = xmlValue(countResult?.body ?? "", "NewHostNumberOfEntries");
  if (!countResult || countResult.status !== 200 || !/^\d+$/.test(countText)) {
    if (!signal.aborted) { job.state = "unavailable"; job.message = "FRITZ!Box-Geräteliste ohne Anmeldung nicht verfügbar. TR-064 muss aktiviert sein; bei erforderlicher Authentifizierung bleibt diese Quelle deaktiviert."; }
    return;
  }
  job.total = Math.min(Number(countText), 256);
  for (let index = 0; index < job.total && !signal.aborted; index++) {
    const result = await call("GetGenericHostEntry", `<NewIndex>${index}</NewIndex>`);
    if (!result || result.status !== 200) throw new Error("FRITZ!Box-Abfrage fehlgeschlagen");
    const target = xmlValue(result.body, "NewIPAddress");
    if (ipv4(target) !== null) {
      try {
        scanAddresses(`${target}/32`);
        const device = await discover(target, [80, 443], signal);
        if (device) job.devices.push({ ...device, source: "fritzbox", name: xmlValue(result.body, "NewHostName").slice(0, 120) || device.name, mac: xmlValue(result.body, "NewMACAddress").slice(0, 32) || undefined });
      } catch { /* Never contact hosts outside the allowlist. */ }
    }
    job.checked++;
  }
}
export function startScan(input: ScanInput) {
  const addresses = input.source === "network" ? scanAddresses(input.subnet) : scanAddresses(`${input.address}/32`);
  if ([...jobs.values()].some(entry => entry.job.state === "running") || Date.now() - lastStart < 10000) throw new Error("Ein Scan läuft bereits oder wurde gerade gestartet. Bitte kurz warten.");
  lastStart = Date.now();
  while (jobs.size >= 10) jobs.delete(jobs.keys().next().value!);
  const controller = new AbortController();
  setMaxListeners(32, controller.signal);
  const job: ScanJob = { id: randomUUID(), source: input.source, state: "running", checked: 0, total: addresses.length, devices: [], startedAt: new Date().toISOString() };
  jobs.set(job.id, { job, controller });
  const deadline = setTimeout(() => { job.message = "Zeitlimit erreicht; bisherige Ergebnisse bleiben verfügbar."; job.state = "cancelled"; controller.abort(); }, 120000);
  deadline.unref();
  void (async () => {
    try {
      if (input.source === "fritzbox") await fritzbox(input.address, job, controller.signal);
      else {
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(12, addresses.length) }, async () => {
          while (next < addresses.length && !controller.signal.aborted) {
            const ip = addresses[next++];
            const device = await discover(ip, [...new Set(input.ports)], controller.signal);
            if (device) job.devices.push(device);
            job.checked++;
          }
        }));
      }
      await enrichNeighbors(job.devices);
      if (job.state === "running") job.state = "complete";
    } catch (error) {
      if (job.state === "running") { job.state = "failed"; job.message = error instanceof Error ? error.message : "Scan fehlgeschlagen"; }
    } finally { clearTimeout(deadline); }
  })();
  return job;
}
