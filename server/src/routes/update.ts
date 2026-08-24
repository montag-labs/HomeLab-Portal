import { Router } from "express";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { getUpdateStatus } from "../services/updateService.js";

export const updateRouter = Router();

updateRouter.get("/update", async (_req, res) => {
  res.json(await getUpdateStatus());
});

updateRouter.post("/update/check", async (_req, res) => {
  res.json(await getUpdateStatus(true));
});

updateRouter.post("/update/install", async (req, res) => {
  const configuredToken = process.env.UPDATE_TOKEN;
  const suppliedToken = req.get("x-homelab-update-token");
  if (!configuredToken || suppliedToken !== configuredToken) {
    res.status(403).json({ state: "rejected", message: "Update ist nicht autorisiert." });
    return;
  }
  if (process.env.UPDATE_MODE !== "lxc") {
    res.status(409).json({ state: "rejected", message: "Automatische Updates sind nur im LXC-Modus verfügbar." });
    return;
  }

  const script = process.env.UPDATE_SCRIPT ?? "/usr/local/sbin/homelab-portal-update";
  try {
    await access(script);
  } catch {
    res.status(503).json({ state: "rejected", message: "Update-Script ist nicht eingerichtet." });
    return;
  }
  const child = spawn(script, [], { detached: true, stdio: "ignore" });
  child.unref();
  res.status(202).json({ state: "updating", message: "Update wurde gestartet." });
});