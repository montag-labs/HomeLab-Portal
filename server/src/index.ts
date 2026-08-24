import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configRouter } from "./routes/config.js";
import { statusRouter } from "./routes/status.js";
import { updateRouter } from "./routes/update.js";
import { devRouter } from "./routes/dev.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 80;

app.use(express.json());
app.use("/api", configRouter);
app.use("/api", statusRouter);
app.use("/api", updateRouter);
if (process.env.NODE_ENV !== "production") {
  app.use("/api", devRouter);
}
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HomeLab-Portal server listening on port ${PORT}`);
});
