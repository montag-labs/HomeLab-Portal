import { Router } from "express";
import { access, unlink, writeFile } from "node:fs/promises";
import { getUpdateStatus } from "../services/updateService.js";
import { hasAdminSession, requireAdmin } from "../middleware/auth.js";
import type { UpdateStatus } from "../types.js";

export const updateRouter = Router();

/**
 * Visitors see what the portal sidebar and the post-restart check need (version, state, progress).
 * Release details, error texts and check timestamps stay with admins.
 */
export function publicUpdateStatus(status: UpdateStatus): UpdateStatus {
  const {
    latestVersion: _latestVersion,
    releaseUrl: _releaseUrl,
    releaseName: _releaseName,
    lastAttemptAt: _lastAttemptAt,
    nextCheckAt: _nextCheckAt,
    error: _error,
    ...rest
  } = status;
  return rest;
}

updateRouter.get("/update", async (req, res) => {
  const status = await getUpdateStatus();
  res.setHeader("Cache-Control", "no-store");
  res.json(hasAdminSession(req) ? status : publicUpdateStatus(status));
});

updateRouter.use("/update", requireAdmin);

updateRouter.post("/update/check", async (_req, res) => {
  res.json(await getUpdateStatus(true));
});

updateRouter.post("/update/install", async (_req, res) => {
  if (process.env.UPDATE_MODE !== "lxc") {
    res.status(409).json({ state: "rejected", message: "Automatische Updates sind nur im LXC-Modus verfügbar." });
    return;
  }

  const script = process.env.UPDATE_SCRIPT ?? "/usr/local/sbin/homelab-portal-update";
  const trigger = process.env.UPDATE_TRIGGER_FILE ?? "/run/homelab-portal/update-request";
  try {
    await access(script);
  } catch {
    res.status(503).json({ state: "rejected", message: "Update-Script ist nicht eingerichtet." });
    return;
  }
  try {
    await unlink(trigger).catch(() => undefined);
    await writeFile(trigger, `${new Date().toISOString()}\n`, { encoding: "utf8", mode: 0o600 });
  } catch {
    res.status(503).json({ state: "rejected", code: "UPDATE_TRIGGER_FAILED", message: "Update konnte nicht ausgelöst werden." });
    return;
  }
  res.status(202).json({ state: "updating", message: "Update wurde gestartet." });
});
