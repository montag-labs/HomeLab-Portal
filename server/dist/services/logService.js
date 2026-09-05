import { createReadStream, createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { mutateConfig, readConfig } from "./configStore.js";
const LOG_DIR = process.env.LOG_DIR ?? "/var/log/homelab-portal";
const MAX_READ_BYTES = 1024 * 1024;
const DEFAULT_POLICY = { rotation: "day", archiveCount: 7 };
const LOG_DEFINITIONS = [
    { id: "install", label: "Installation", fileName: "homelab-portal-install.log", writable: true, modes: ["lxc"] },
    { id: "update", label: "LXC-Update", fileName: "homelab-portal-update.log", writable: true, modes: ["lxc"] },
    { id: "docker-update", label: "Docker-Update", fileName: "homelab-portal-docker-update.log", writable: true, modes: ["docker"] },
    { id: "service", label: "Portal-Service", fileName: "homelab-portal-service.log", writable: true, modes: undefined },
    { id: "healthcheck", label: "Healthcheck", fileName: "homelab-portal-healthcheck.log", writable: true, modes: undefined },
    { id: "backup", label: "Backup und Rollback", fileName: "homelab-portal-backup.log", writable: true, modes: undefined },
];
function getRuntimeMode() {
    const mode = process.env.UPDATE_MODE;
    return mode === "lxc" || mode === "docker" ? mode : undefined;
}
function getVisibleDefinitions() {
    const mode = getRuntimeMode();
    if (!mode)
        return LOG_DEFINITIONS;
    return LOG_DEFINITIONS.filter((definition) => definition.modes === undefined || definition.modes.includes(mode));
}
function getDefinition(id) {
    return getVisibleDefinitions().find((definition) => definition.id === id);
}
function getCurrentPath(id) {
    const definition = getDefinition(id);
    if (!definition)
        throw new Error("Unknown log");
    return path.join(LOG_DIR, definition.fileName);
}
function getArchivePrefix(id) {
    const definition = getDefinition(id);
    if (!definition)
        throw new Error("Unknown log");
    return `${definition.fileName}.`;
}
async function getPolicy() {
    const config = await readConfig();
    return config.settings.logPolicy ?? DEFAULT_POLICY;
}
async function listArchives(id) {
    const prefix = getArchivePrefix(id);
    let names = [];
    try {
        names = await fs.readdir(LOG_DIR);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
    const archives = [];
    for (const fileName of names.filter((name) => name.startsWith(prefix) && name.endsWith(".gz"))) {
        const filePath = path.join(LOG_DIR, fileName);
        try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile())
                continue;
            archives.push({
                id: fileName,
                fileName,
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
            });
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
        }
    }
    return archives.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}
export async function listLogs() {
    const result = [];
    for (const definition of getVisibleDefinitions()) {
        const currentPath = getCurrentPath(definition.id);
        let size = 0;
        let modifiedAt;
        try {
            const stats = await fs.stat(currentPath);
            if (stats.isFile()) {
                size = stats.size;
                modifiedAt = stats.mtime.toISOString();
            }
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
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
export async function readLog(id) {
    const definition = getDefinition(id);
    if (!definition)
        throw new Error("Unknown log");
    const filePath = getCurrentPath(id);
    let stats;
    try {
        stats = await fs.stat(filePath);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return { id, content: "", truncated: false };
        }
        throw error;
    }
    if (!stats.isFile())
        throw new Error("Log is not a file");
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
export function getDownloadPath(id) {
    getDefinition(id);
    return getCurrentPath(id);
}
export function getArchivePath(id, archiveId) {
    const prefix = getArchivePrefix(id);
    if (!archiveId.startsWith(prefix) || !archiveId.endsWith(".gz") || path.basename(archiveId) !== archiveId) {
        throw new Error("Invalid archive");
    }
    return path.join(LOG_DIR, archiveId);
}
export async function archiveLog(id) {
    const definition = getDefinition(id);
    if (!definition)
        throw new Error("Unknown log");
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
    }
    catch (error) {
        await fs.rm(temporaryPath, { force: true });
        throw error;
    }
}
export async function emptyLog(id) {
    const definition = getDefinition(id);
    if (!definition?.writable)
        throw new Error("Log is not writable");
    await fs.mkdir(LOG_DIR, { recursive: true, mode: 0o750 });
    await fs.writeFile(getCurrentPath(id), "", { flag: "w", mode: 0o640 });
    return listLogs();
}
async function removeOldArchives(id, archiveCount) {
    const archives = await listArchives(id);
    for (const archive of archives.slice(Math.max(0, archiveCount))) {
        await fs.rm(getArchivePath(id, archive.id), { force: true });
    }
}
export async function getLogPolicy() {
    return getPolicy();
}
export async function updateLogPolicy(policy) {
    await mutateConfig((config) => {
        config.settings.logPolicy = policy;
    });
    for (const definition of getVisibleDefinitions()) {
        await removeOldArchives(definition.id, policy.archiveCount);
    }
    return policy;
}
