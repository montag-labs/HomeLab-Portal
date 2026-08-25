import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PortalConfig } from "../types.js";
import type { LogPolicy } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../data/config.json");
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "../../data/config.default.json");
const EMBEDDED_DEFAULT_CONFIG_PATH = path.resolve(__dirname, "../../config.default.json");
const DEFAULT_LOG_POLICY: LogPolicy = { rotation: "day", archiveCount: 7 };

// Serializes writes so concurrent requests never interleave file access.
let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureConfigExists(): Promise<void> {
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    let fallback: string;
    try {
      fallback = await fs.readFile(DEFAULT_CONFIG_PATH, "utf-8");
    } catch {
      fallback = await fs.readFile(EMBEDDED_DEFAULT_CONFIG_PATH, "utf-8");
    }
    await fs.writeFile(CONFIG_PATH, fallback, "utf-8");
  }
}

export async function readConfig(): Promise<PortalConfig> {
  await ensureConfigExists();
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw) as PortalConfig;
  config.settings.logPolicy ??= DEFAULT_LOG_POLICY;
  return config;
}

export async function writeConfig(config: PortalConfig): Promise<void> {
  await ensureConfigExists();
  const task = writeQueue.then(() =>
    fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
  );
  writeQueue = task.catch(() => undefined);
  return task;
}
