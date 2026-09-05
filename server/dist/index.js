import express from "express";
import compression from "compression";
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
app.use(compression());
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
app.use((error, _req, res, _next) => {
    console.error(error);
    if (res.headersSent)
        return;
    res.status(500).json({ error: "Internal server error" });
});
const clientDist = path.resolve(__dirname, "../../client/dist");
const clientAssets = path.join(clientDist, "assets");
app.use("/assets", express.static(clientAssets, { immutable: true, maxAge: "1y" }));
app.use(express.static(clientDist, {
    maxAge: "1h",
    setHeaders: (response, filePath) => {
        if (path.basename(filePath) === "index.html") {
            response.setHeader("Cache-Control", "no-cache");
        }
    },
}));
app.get(/.*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
});
app.listen(PORT, () => {
    console.log(`HomeLab-Portal server listening on port ${PORT}`);
});
