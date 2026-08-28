import { createReadStream, createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { mutateConfig, readConfig } from "./configStore.js";
import type { LogContent, LogPolicy, LogSource } from "../types.js";

const LOG_DIR = process.env.LOG_DIR ?? "/var/log/homelab-portal";
const MAX_READ_BYTES = 1024 * 1024;
const DEFAULT_POLICY: LogPolicy = { rotation: "day", archiveCount: 7 };

const LOG_DEFINITIONS = [
  { id: "install", label: "Installation", fileName: "homelab-portal-install.log", writable: true },
  { id: "update", label: "LXC-Update", fileName: "homelab-portal-update.log", writable: true },
  { id: "docker-update", label: "Docker-Update", fileName: "homelab-portal-docker-update.log", writable: true },
  { id: "service", label: "Portal-Service", fileName: "homelab-portal-service.log", writable: true },
  { id: "healthcheck", label: "Healthcheck", fileName: "homelab-portal-healthcheck.log", writable: true },
  { id: "backup", label: "Backup und Rollback", fileName: "homelab-portal-backup.log", writable: true },
] as const;

type LogId = (typeof LOG_DEFINITIONS)[number]["id"];

function getDefinition(id: string) {
  return LOG_DEFINITIONS.find((definition) => definition.id === id);
}

function getCurrentPath(id: string): string {
  const definition = getDefinition(id);
  if (!definition) throw new Error("Unknown log");
  return path.join(LOG_DIR, definition.fileName);
}

function getArchivePrefix(id: string): string {
  const definition = getDefinition(id);
  if (!definition) throw new Error("Unknown log");
  return `${definition.fileName}.`;
}

async function getPolicy(): Promise<LogPolicy> {
  const config = await readConfig();
  return config.settings.logPolicy ?? DEFAULT_POLICY;
}

async function listArchives(id: LogId) {
  const prefix = getArchivePrefix(id);
  let names: string[] = [];
  try {
    names = await fs.readdir(LOG_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const archives = [];
  for (const fileName of names.filter((name) => name.startsWith(prefix) && name.endsWith(".gz"))) {
    const filePath = path.join(LOG_DIR, fileName);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;
      archives.push({
        id: fileName,
        fileName,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return archives.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function listLogs(): Promise<LogSource[]> {
  const result: LogSource[] = [];
  for (const definition of LOG_DEFINITIONS) {
    const currentPath = getCurrentPath(definition.id);
    let size = 0;
    let modifiedAt: string | undefined;
    try {
      const stats = await fs.stat(currentPath);
      if (stats.isFile()) {
        size = stats.size;
        modifiedAt = stats.mtime.toISOString();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    result.push({
      id: definition.id,
      label: definition.label,
      available: Boolean(modifiedAt),
      size,
      modifiedAt,
      archives: await listArchives(definition.id),
    });
  }
  return result;
}

export async function readLog(id: string): Promise<LogContent> {
  const definition = getDefinition(id);
  if (!definition) throw new Error("Unknown log");
  const filePath = getCurrentPath(id);
  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { id, content: "", truncated: false };
    }
    throw error;
  }
  if (!stats.isFile()) throw new Error("Log is not a file");
  const truncated = stats.size > MAX_READ_BYTES;
  const handle = await fs.open(filePath, "r");
  const buffer = Buffer.alloc(Math.min(stats.size, MAX_READ_BYTES));
  await handle.read(buffer, 0, buffer.length, truncated ? stats.size - MAX_READ_BYTES : 0);
  await handle.close();
  const content = buffer.toString("utf8");
  return {
    id,
    content: truncated ? content.slice(-MAX_READ_BYTES) : content,
    truncated,
  };
}

export function getDownloadPath(id: string): string {
  getDefinition(id);
  return getCurrentPath(id);
}

export function getArchivePath(id: string, archiveId: string): string {
  const prefix = getArchivePrefix(id);
  if (!archiveId.startsWith(prefix) || !archiveId.endsWith(".gz") || path.basename(archiveId) !== archiveId) {
    throw new Error("Invalid archive");
  }
  return path.join(LOG_DIR, archiveId);
}

export async function archiveLog(id: string): Promise<LogSource[]> {
  const definition = getDefinition(id);
  if (!definition) throw new Error("Unknown log");
  const currentPath = getCurrentPath(id);
  await fs.mkdir(LOG_DIR, { recursive: true, mode: 0o750 });
  await fs.writeFile(currentPath, "", { flag: "a", mode: 0o640 });
  const archiveId = `${definition.fileName}.${new Date().toISOString().replace(/[.:]/g, "-")}.gz`;
  const temporaryPath = path.join(LOG_DIR, `.${archiveId}.tmp`);
  try {
    await pipeline(createReadStream(currentPath), createGzip(), createWriteStream(temporaryPath, { flags: "wx", mode: 0o640 }));
    await fs.rename(temporaryPath, path.join(LOG_DIR, archiveId));
    await fs.truncate(currentPath, 0);
    await removeOldArchives(definition.id, (await getPolicy()).archiveCount);
    return listLogs();
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function emptyLog(id: string): Promise<LogSource[]> {
  const definition = getDefinition(id);
  if (!definition?.writable) throw new Error("Log is not writable");
  await fs.mkdir(LOG_DIR, { recursive: true, mode: 0o750 });
  await fs.writeFile(getCurrentPath(id), "", { flag: "w", mode: 0o640 });
  return listLogs();
}

async function removeOldArchives(id: LogId, archiveCount: number): Promise<void> {
  const archives = await listArchives(id);
  for (const archive of archives.slice(Math.max(0, archiveCount))) {
    await fs.rm(getArchivePath(id, archive.id), { force: true });
  }
}

export async function getLogPolicy(): Promise<LogPolicy> {
  return getPolicy();
}

export async function updateLogPolicy(policy: LogPolicy): Promise<LogPolicy> {
  await mutateConfig((config) => {
    config.settings.logPolicy = policy;
  });
  for (const definition of LOG_DEFINITIONS) {
    await removeOldArchives(definition.id, policy.archiveCount);
  }
  return policy;
}

export const logIds = LOG_DEFINITIONS.map((definition) => definition.id);
