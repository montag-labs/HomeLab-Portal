import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PortalConfig } from "../types.js";
import type { LogPolicy } from "../types.js";
import { randomUUID } from "node:crypto";
import { portalConfigSchema } from "../schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../data/config.json");
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "../../data/config.default.json");
const EMBEDDED_DEFAULT_CONFIG_PATH = path.resolve(__dirname, "../../config.default.json");
const DEFAULT_LOG_POLICY: LogPolicy = { rotation: "day", archiveCount: 7 };

// Serializes complete read-modify-write transactions.
let configQueue: Promise<unknown> = Promise.resolve();

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
  const parsed = portalConfigSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("Stored configuration is invalid");
  const config = parsed.data;
  config.settings.logPolicy ??= DEFAULT_LOG_POLICY;
  return config;
}

async function atomicWrite(config: PortalConfig): Promise<void> {
  const parsed = portalConfigSchema.parse(config);
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(parsed, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    await fs.rename(temporaryPath, CONFIG_PATH);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export function mutateConfig<T>(mutator: (config: PortalConfig) => T | Promise<T>): Promise<T> {
  const task = configQueue.then(async () => {
    const config = await readConfig();
    const result = await mutator(config);
    await atomicWrite(config);
    return result;
  });
  configQueue = task.catch(() => undefined);
  return task;
}

export async function writeConfig(config: PortalConfig): Promise<void> {
  await mutateConfig((current) => {
    current.settings = config.settings;
    current.categories = config.categories;
  });
}
