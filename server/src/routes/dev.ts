import { Router } from "express";
import os from "node:os";
import { readConfig } from "../services/configStore.js";
import { getUpdateStatus } from "../services/updateService.js";
import { checkReachability } from "./status.js";

export const devRouter = Router();

function safeEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => !/(token|secret|password|passwd|key|credential)/i.test(key))
      .map(([key, value]) => [key, value ?? ""]),
  );
}

devRouter.get("/dev/debug", async (_req, res) => {
  const config = await readConfig();
  const urls = config.categories.flatMap((category) =>
    category.apps.flatMap((app) => [app.domain, app.localIp].filter((url): url is string => Boolean(url))),
  );
  const reachability = await Promise.all(
    urls.map(async (url) => ({ url, result: await checkReachability(url) })),
  );

  res.json({
    mode: "development",
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
    },
    host: {
      hostname: os.hostname(),
      uptimeSeconds: os.uptime(),
      cpus: os.cpus().length,
      networkInterfaces: os.networkInterfaces(),
    },
    environment: safeEnvironment(),
    config,
    update: await getUpdateStatus(true),
    reachability,
  });
});