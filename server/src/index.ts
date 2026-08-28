import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configRouter } from "./routes/config.js";
import { statusRouter } from "./routes/status.js";
import { updateRouter } from "./routes/update.js";
import { devRouter } from "./routes/dev.js";
import { logsRouter } from "./routes/logs.js";
import { authRouter } from "./middleware/auth.js";
import { securityHeaders } from "./middleware/security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.HOMELAB_PORT ?? process.env.PORT ?? 80;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use("/api", authRouter);
app.use("/api", configRouter);
app.use("/api", statusRouter);
app.use("/api", updateRouter);
app.use("/api", logsRouter);
if ((process.env.APP_ENV ?? process.env.NODE_ENV ?? "production") !== "production") {
  app.use("/api", devRouter);
}
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HomeLab-Portal server listening on port ${PORT}`);
});
