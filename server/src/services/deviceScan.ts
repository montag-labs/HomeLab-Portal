import { setMaxListeners } from "node:events";
import { randomUUID } from "node:crypto";
import { discover, enrichNeighbors } from "./scan/network.js";
import { scanFritzbox } from "./scan/fritzbox.js";
import { scanAddresses } from "./scan/subnet.js";
import type { ScanInput, ScanJob } from "./scan/types.js";

export { allowedSubnets, ipv4, parseSubnet, privateIp, scanAddresses } from "./scan/subnet.js";
export { probe } from "./scan/probe.js";
export { scanInputSchema } from "./scan/types.js";
export type { ScanJob } from "./scan/types.js";

const MAX_JOBS = 10;
const MIN_START_INTERVAL_MS = 10_000;
const SCAN_DEADLINE_MS = 120_000;
const NETWORK_CONCURRENCY = 12;

const jobs = new Map<string, { job: ScanJob; controller: AbortController }>();
let lastStart = 0;

export function getScan(id: string) { return jobs.get(id)?.job; }

export function cancelScan(id: string) {
  const entry = jobs.get(id);
  if (!entry) return undefined;
  if (entry.job.state === "running") {
    entry.job.state = "cancelled";
    entry.controller.abort();
  }
  return entry.job;
}

async function scanNetwork(addresses: string[], ports: number[], job: ScanJob, signal: AbortSignal) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(NETWORK_CONCURRENCY, addresses.length) }, async () => {
    while (next < addresses.length && !signal.aborted) {
      const device = await discover(addresses[next++], ports, signal);
      if (device) job.devices.push(device);
      job.checked++;
    }
  }));
}

export function startScan(input: ScanInput) {
  const addresses = input.source === "network" ? scanAddresses(input.subnet) : scanAddresses(`${input.address}/32`);
  if ([...jobs.values()].some((entry) => entry.job.state === "running") || Date.now() - lastStart < MIN_START_INTERVAL_MS) {
    throw new Error("Ein Scan läuft bereits oder wurde gerade gestartet. Bitte kurz warten.");
  }
  lastStart = Date.now();
  while (jobs.size >= MAX_JOBS) jobs.delete(jobs.keys().next().value!);
  const controller = new AbortController();
  setMaxListeners(32, controller.signal);
  const job: ScanJob = {
    id: randomUUID(),
    source: input.source,
    state: "running",
    checked: 0,
    total: addresses.length,
    devices: [],
    startedAt: new Date().toISOString(),
  };
  jobs.set(job.id, { job, controller });
  const deadline = setTimeout(() => {
    job.message = "Zeitlimit erreicht; bisherige Ergebnisse bleiben verfügbar.";
    job.state = "cancelled";
    controller.abort();
  }, SCAN_DEADLINE_MS);
  deadline.unref();
  void (async () => {
    try {
      if (input.source === "fritzbox") await scanFritzbox(input.address, job, controller.signal);
      else await scanNetwork(addresses, [...new Set(input.ports)], job, controller.signal);
      await enrichNeighbors(job.devices);
      if (job.state === "running") job.state = "complete";
    } catch (error) {
      if (job.state === "running") {
        job.state = "failed";
        job.message = error instanceof Error ? error.message : "Scan fehlgeschlagen";
      }
    } finally {
      clearTimeout(deadline);
    }
  })();
  return job;
}
