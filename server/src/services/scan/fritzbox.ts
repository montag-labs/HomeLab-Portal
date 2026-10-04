import { randomUUID } from "node:crypto";
import type { Device } from "../deviceDashboard.js";
import { probe } from "./probe.js";
import { ipv4 } from "./subnet.js";
import type { ScanJob } from "./types.js";

const SERVICE = "urn:dslforum-org:service:Hosts:1";
const MAX_ENTRIES = 512;
const CONCURRENCY = 16;

function xmlValue(xml: string, name: string): string {
  return new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(xml)?.[1]
    ?.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"') ?? "";
}

function detectDeviceIcon(name: string): Device["icon"] {
  const n = name.toLowerCase();
  if (["light", "lampe", "hue", "bulb", "led"].some((word) => n.includes(word))) return "light";
  if (n.includes("cam") || n.includes("kamera")) return "camera";
  if (["plug", "steckdose", "shelly", "gosund", "tasmota", "switch"].some((word) => n.includes(word))) return "plug";
  if (["router", "fritz", "repeater", "ap", "gateway"].some((word) => n.includes(word))) return "router";
  if (["sensor", "temp", "motion", "wetter"].some((word) => n.includes(word))) return "sensor";
  return "device";
}

/** Reads the host list through the unauthenticated TR-064 Hosts service. */
export async function scanFritzbox(ip: string, job: ScanJob, signal: AbortSignal): Promise<void> {
  const call = (action: string, content = "") => probe(
    `http://${ip}:49000/upnp/control/hosts`,
    signal,
    "POST",
    `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action} xmlns:u="${SERVICE}">${content}</u:${action}></s:Body></s:Envelope>`,
    `${SERVICE}#${action}`,
  );
  const countResult = await call("GetHostNumberOfEntries");
  const countText = xmlValue(countResult?.body ?? "", "NewHostNumberOfEntries");
  if (!countResult || countResult.status !== 200 || !/^\d+$/.test(countText)) {
    if (!signal.aborted) {
      job.state = "unavailable";
      job.message = "FRITZ!Box-Geräteliste ohne Anmeldung nicht verfügbar. TR-064 muss aktiviert sein; bei erforderlicher Authentifizierung bleibt diese Quelle deaktiviert.";
    }
    return;
  }
  const totalEntries = Math.min(Number(countText), MAX_ENTRIES);
  job.total = totalEntries;

  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, totalEntries) }, async () => {
    while (nextIndex < totalEntries && !signal.aborted) {
      const index = nextIndex++;
      try {
        const result = await call("GetGenericHostEntry", `<NewIndex>${index}</NewIndex>`);
        if (result?.status === 200) {
          const target = xmlValue(result.body, "NewIPAddress");
          const hostName = xmlValue(result.body, "NewHostName").slice(0, 120);
          const mac = xmlValue(result.body, "NewMACAddress").slice(0, 32);
          const cleanMac = mac && mac !== "00:00:00:00:00:00" ? mac.replaceAll("-", ":").toUpperCase() : undefined;
          if (ipv4(target) !== null && xmlValue(result.body, "NewActive") !== "0") {
            job.devices.push({
              id: randomUUID(),
              name: hostName || `Gerät ${target}`,
              url: `http://${target}`,
              ip: target,
              mac: cleanMac,
              source: "fritzbox",
              icon: detectDeviceIcon(hostName),
            });
          }
        }
      } catch {
        // Skip a single failing entry.
      }
      job.checked++;
    }
  }));
}
