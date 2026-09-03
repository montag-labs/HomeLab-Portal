import { Router } from "express";
import { z } from "zod";
import http from "node:http";
import https from "node:https";
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

export function checkReachability(urlString: string): Promise<ReachabilityDetails> {
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
          rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
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

async function checkReachabilityCached(url: string): Promise<ReachabilityDetails> {
  const cached = resultCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) resultCache.delete(url);

  const pending = pendingChecks.get(url);
  if (pending) return pending;

  const check = checkReachability(url)
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
): Promise<Record<string, ReachabilityDetails>> {
  const uniqueUrls = [...new Set(urls)];
  const results: Record<string, ReachabilityDetails> = {};
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;
      results[url] = await checkReachabilityCached(url);
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_CHECKS, uniqueUrls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function getConfiguredUrls(): Promise<Set<string>> {
  const config = await readConfig();
  return new Set(
    config.categories.flatMap((category) =>
      category.apps.flatMap((app) => [app.domain, app.localIp])
        .filter((url): url is string => Boolean(url))
        .map((url) => {
          try { return new URL(url).href; }
          catch { return ""; }
        })
        .filter(Boolean),
    ),
  );
}

statusRouter.get("/statuses", limitStatusRequests, async (_req, res) => {
  const configuredUrls = await getConfiguredUrls();
  const results = await checkReachabilities([...configuredUrls]);
  res.json({ checkedAt: new Date().toISOString(), results });
});

statusRouter.get("/status", limitStatusRequests, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const allowedUrls = await getConfiguredUrls();
  const normalizedUrl = new URL(parsed.data.url).href;
  if (!allowedUrls.has(normalizedUrl)) {
    return res.status(403).json({ error: "Only configured service URLs can be checked" });
  }
  const result = await checkReachabilityCached(normalizedUrl);
  res.json(result);
});
