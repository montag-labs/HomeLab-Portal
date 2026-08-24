import { Router } from "express";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { getUpdateStatus } from "../services/updateService.js";
import {
  acknowledgeUpdateToken,
  getPendingUpdateToken,
  readUpdateToken,
} from "../services/updateTokenService.js";

export const updateRouter = Router();

updateRouter.get("/update", async (_req, res) => {
  res.json(await getUpdateStatus());
});

updateRouter.post("/update/check", async (_req, res) => {
  res.json(await getUpdateStatus(true));
});

updateRouter.get("/update/token", async (_req, res) => {
  const token = await getPendingUpdateToken();
  res.json({ available: Boolean(token), token });
});

updateRouter.post("/update/token/confirm", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const acknowledged = await acknowledgeUpdateToken(token);
  res.status(acknowledged ? 204 : 400).send();
});

updateRouter.post("/update/install", async (req, res) => {
  const configuredToken = await readUpdateToken();
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