import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configRouter } from "./routes/config.js";
import { statusRouter } from "./routes/status.js";
import { updateRouter } from "./routes/update.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(express.json());
app.use("/api", configRouter);
app.use("/api", statusRouter);
app.use("/api", updateRouter);

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HomeLab-Portal server listening on port ${PORT}`);
});
