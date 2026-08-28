import { Router } from "express";
import { access, writeFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { getUpdateStatus } from "../services/updateService.js";
import {
  acknowledgeUpdateToken,
  getPendingUpdateToken,
  readUpdateToken,
} from "../services/updateTokenService.js";
import { requireAdmin } from "../middleware/auth.js";

export const updateRouter = Router();

function tokensMatch(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

updateRouter.get("/update", async (_req, res) => {
  res.json(await getUpdateStatus());
});

updateRouter.use("/update", requireAdmin);

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
  if (!configuredToken || !tokensMatch(suppliedToken, configuredToken)) {
    res.status(403).json({ state: "rejected", message: "Update ist nicht autorisiert." });
    return;
  }
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
