import { Router } from "express";
import { z } from "zod";
import http from "node:http";
import https from "node:https";
import { dashboardStore, publicDashboard } from "../services/deviceDashboard.js";
import { readConfig } from "../services/configStore.js";
import { limitStatusRequests } from "../middleware/security.js";

export const statusRouter = Router();

const querySchema = z.object({
  url: z.string().url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP and HTTPS URLs are allowed"),
});

export interface ReachabilityDetails {
  online: boolean;
  method?: "HEAD" | "GET";
  statusCode?: number;
  error?: string;
}

const RESULT_CACHE_MS = 25_000;
const MAX_CONCURRENT_CHECKS = 8;
const resultCache = new Map<string, { expiresAt: number; result: ReachabilityDetails }>();
const pendingChecks = new Map<string, Promise<ReachabilityDetails>>();

/** Self-signed certificates are accepted globally via ALLOW_INSECURE_TLS or per URL via the app settings. */
export function checkReachability(urlString: string, insecureTls = false): Promise<ReachabilityDetails> {
  return new Promise((resolve) => {
    let target: URL;
    try {
      target = new URL(urlString);
    } catch {
      resolve({ online: false, error: "Ungültige URL" });
      return;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      resolve({ online: false, error: "Nicht unterstütztes Protokoll" });
      return;
    }
    const client = target.protocol === "https:" ? https : http;
    let settled = false;

    const finish = (details: ReachabilityDetails) => {
      if (settled) return;
      settled = true;
      resolve(details);
    };

    const request = (method: "HEAD" | "GET") => {
      const req = client.request(
        target,
        {
          method,
          timeout: 8000,
          rejectUnauthorized: !insecureTls && process.env.ALLOW_INSECURE_TLS !== "true",
        },
        (res) => {
          const shouldFallback = method === "HEAD" && (res.statusCode === 405 || res.statusCode === 501);
          res.resume();
          if (shouldFallback) {
            request("GET");
          } else {
            finish({ online: true, method, statusCode: res.statusCode });
          }
        }
      );
      req.on("timeout", () => {
        req.destroy();
        finish({ online: false, method, error: "Timeout" });
      });
      req.on("error", (error: Error) => finish({ online: false, method, error: error.message }));
      req.end();
    };

    request("HEAD");
  });
}

async function checkReachabilityReliably(url: string, insecureTls: boolean): Promise<ReachabilityDetails> {
  const firstResult = await checkReachability(url, insecureTls);
  return firstResult.online ? firstResult : checkReachability(url, insecureTls);
}

async function checkReachabilityCached(url: string, insecureTls: boolean): Promise<ReachabilityDetails> {
  const cached = resultCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) resultCache.delete(url);

  const pending = pendingChecks.get(url);
  if (pending) return pending;

  const check = checkReachabilityReliably(url, insecureTls)
    .then((result) => {
      resultCache.set(url, { expiresAt: Date.now() + RESULT_CACHE_MS, result });
      return result;
    })
    .finally(() => pendingChecks.delete(url));
  pendingChecks.set(url, check);
  return check;
}

export async function checkReachabilities(
  urls: string[],
  insecureUrls: ReadonlySet<string> = new Set(),
): Promise<Record<string, ReachabilityDetails>> {
  const uniqueUrls = [...new Set(urls)];
  const results: Record<string, ReachabilityDetails> = {};
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;
      results[url] = await checkReachabilityCached(url, insecureUrls.has(url));
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_CHECKS, uniqueUrls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function normalizeUrl(url: string | undefined): string {
  if (!url) return "";
  try { return new URL(url).href; }
  catch { return ""; }
}

/** All checkable URLs; `insecure` holds those an app marked as accepting self-signed certificates. */
export async function getConfiguredUrls(): Promise<{ urls: Set<string>; insecure: Set<string> }> {
  const [config, dashboard] = await Promise.all([readConfig(), dashboardStore.read()]);
  const urls = new Set<string>();
  const insecure = new Set<string>();
  for (const app of config.categories.flatMap((category) => category.apps)) {
    for (const [address, tolerant] of [[app.domain, app.domainInsecureTls], [app.localIp, app.localIpInsecureTls]] as const) {
      const url = normalizeUrl(address);
      if (!url) continue;
      urls.add(url);
      if (tolerant && url.startsWith("https:")) insecure.add(url);
    }
  }
  for (const device of publicDashboard(dashboard).devices) urls.add(new URL(device.url).href);
  return { urls, insecure };
}

statusRouter.get("/statuses", limitStatusRequests, async (_req, res) => {
  const { urls, insecure } = await getConfiguredUrls();
  const results = await checkReachabilities([...urls], insecure);
  res.json({ checkedAt: new Date().toISOString(), results });
});

statusRouter.get("/status", limitStatusRequests, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { urls, insecure } = await getConfiguredUrls();
  const normalizedUrl = new URL(parsed.data.url).href;
  if (!urls.has(normalizedUrl)) {
    return res.status(403).json({ error: "Only configured service URLs can be checked" });
  }
  const result = await checkReachabilityCached(normalizedUrl, insecure.has(normalizedUrl));
  res.json(result);
});
