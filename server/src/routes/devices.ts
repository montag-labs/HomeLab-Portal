import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { dashboardSchema, dashboardStore, publicDashboard } from "../services/deviceDashboard.js";
import { allowedSubnets, cancelScan, getScan, scanInputSchema, startScan } from "../services/deviceScan.js";

export const devicesRouter = Router();
devicesRouter.get("/devices/dashboard", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(publicDashboard(await dashboardStore.read()));
});
devicesRouter.use("/devices", requireAdmin);
devicesRouter.get("/devices/inventory", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await dashboardStore.read());
});
devicesRouter.post("/devices/dashboard/validate", (req, res) => {
  const parsed = dashboardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid dashboard import" });
  res.json(parsed.data);
});
devicesRouter.put("/devices/dashboard", async (req, res) => {
  const parsed = dashboardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ungültiges Dashboard: " + parsed.error.issues.map(issue => issue.message).join("; ") });
  const saved = await dashboardStore.save(parsed.data);
  if (!saved) return res.status(409).json({ error: "Das Dashboard wurde inzwischen geändert. Entwurf exportieren und neu laden." });
  res.json(saved);
});
devicesRouter.get("/devices/scans/options", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ subnets: allowedSubnets(), maxAddresses: 256, maxDurationSeconds: 120 });
});
devicesRouter.post("/devices/scans", (req, res) => {
  const parsed = scanInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ungültige Scan-Einstellungen" });
  try { res.status(202).json(startScan(parsed.data)); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Scan konnte nicht starten" }); }
});
devicesRouter.get("/devices/scans/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const job = getScan(req.params.id);
  if (!job) return res.status(404).json({ error: "Scan nicht gefunden (möglicherweise Serverneustart)" });
  res.json(job);
});
devicesRouter.delete("/devices/scans/:id", (req, res) => {
  const job = cancelScan(req.params.id);
  if (!job) return res.status(404).json({ error: "Scan nicht gefunden" });
  res.json(job);
});
