import { Router } from "express";
import { access, writeFile } from "node:fs/promises";
import { getUpdateStatus } from "../services/updateService.js";
import { requireAdmin } from "../middleware/auth.js";

export const updateRouter = Router();

updateRouter.get("/update", async (_req, res) => {
  res.json(await getUpdateStatus());
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
  await writeFile(trigger, `${new Date().toISOString()}\n`, { encoding: "utf8", mode: 0o600 });
  res.status(202).json({ state: "updating", message: "Update wurde gestartet." });
});
