import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PortalConfig } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../data/config.json");

// Serializes writes so concurrent requests never interleave file access.
let writeQueue: Promise<unknown> = Promise.resolve();

export async function readConfig(): Promise<PortalConfig> {
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as PortalConfig;
}

export async function writeConfig(config: PortalConfig): Promise<void> {
  const task = writeQueue.then(() =>
    fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
  );
  writeQueue = task.catch(() => undefined);
  return task;
}
