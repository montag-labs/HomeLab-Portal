import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/montag-labs/HomeLab-Portal/releases/latest";
const REQUEST_TIMEOUT_MS = 5000;
const statusPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/update-status.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPackagePath = path.resolve(__dirname, "../../package.json");
const updateProgressPath = process.env.UPDATE_PROGRESS_FILE ?? "/run/homelab-portal-update/update-progress.json";
let cachedStatus;
let cacheLoaded = false;
let pendingStatus;
async function loadStatus() {
    if (cacheLoaded)
        return;
    cacheLoaded = true;
    try {
        const value = JSON.parse(await readFile(statusPath, "utf8"));
        if (["current", "available", "failed"].includes(value.state) &&
            typeof value.installedVersion === "string" &&
            typeof value.checkedAt === "string" && Number.isFinite(Date.parse(value.checkedAt)) &&
            (value.state === "failed" || (typeof value.latestVersion === "string" && parseVersion(value.latestVersion)))) {
            cachedStatus = value;
        }
    }
    catch {
        // Missing or invalid cache: check on this request.
    }
}
async function saveStatus(status) {
    try {
        await mkdir(path.dirname(statusPath), { recursive: true });
        const temporaryPath = statusPath + "." + process.pid + ".tmp";
        await writeFile(temporaryPath, JSON.stringify(status), "utf8");
        await rename(temporaryPath, statusPath);
    }
    catch (error) {
        console.warn("[update-check] Could not persist status:", error);
    }
}
async function readUpdateProgress() {
    try {
        const value = JSON.parse(await readFile(updateProgressPath, "utf8"));
        if (value.percent === undefined || typeof value.step !== "string" || typeof value.updatedAt !== "string")
            return undefined;
        const state = value.state === "failed" ? "failed" : "updating";
        return {
            state,
            percent: Math.min(100, Math.max(0, value.percent)),
            step: value.step,
            targetVersion: typeof value.targetVersion === "string" ? value.targetVersion : undefined,
            updatedAt: value.updatedAt,
        };
    }
    catch {
        return undefined;
    }
}
async function getInstalledVersion() {
    const packageJson = JSON.parse(await readFile(serverPackagePath, "utf8"));
    if (typeof packageJson.version !== "string") {
        throw new Error("Installed version is unavailable");
    }
    return packageJson.version;
}
function parseVersion(value) {
    const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
    if (!match)
        return undefined;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}
function isNewer(candidate, installed) {
    const candidateVersion = parseVersion(candidate);
    const installedVersion = parseVersion(installed);
    if (!candidateVersion || !installedVersion)
        return false;
    for (let index = 0; index < candidateVersion.length; index += 1) {
        if (candidateVersion[index] !== installedVersion[index]) {
            return candidateVersion[index] > installedVersion[index];
        }
    }
    return false;
}
async function getCapabilities() {
    const mode = process.env.UPDATE_MODE;
    if (mode === "lxc") {
        return { mode: "lxc", canUpdate: true, reason: "Update wird über die geschützte Admin-Sitzung ausgelöst." };
    }
    if (mode === "docker") {
        return { mode: "docker", canUpdate: false, reason: "Docker-Updates werden hostseitig ausgeführt." };
    }
    return { mode: "unsupported", canUpdate: false, reason: "Betriebsmodus nicht konfiguriert." };
}
export async function getUpdateStatus(force = false) {
    if (pendingStatus)
        return pendingStatus;
    pendingStatus = resolveUpdateStatus(force);
    try {
        return await pendingStatus;
    }
    finally {
        pendingStatus = undefined;
    }
}
async function resolveUpdateStatus(force) {
    const progress = await readUpdateProgress();
    if (progress?.state === "updating" || (progress?.state === "failed" && !force)) {
        const capabilities = await getCapabilities();
        const installedVersion = await getInstalledVersion();
        return {
            state: progress.state,
            installedVersion,
            latestVersion: progress.targetVersion,
            updateAvailable: progress.state === "updating",
            checkedAt: progress.updatedAt,
            capabilities,
            progress,
            errorCode: progress.state === "failed" ? "UPDATE_SCRIPT_FAILED" : undefined,
            error: progress.state === "failed" ? "Das Update-Skript ist fehlgeschlagen." : undefined,
        };
    }
    await loadStatus();
    const capabilities = await getCapabilities();
    let installedVersion;
    try {
        installedVersion = await getInstalledVersion();
    }
    catch {
        return {
            state: "failed",
            installedVersion: "unknown",
            updateAvailable: false,
            checkedAt: new Date().toISOString(),
            capabilities,
            errorCode: "UPDATE_CHECK_FAILED",
            error: "Installierte Version konnte nicht ermittelt werden.",
        };
    }
    // Calendar days follow the server's configured timezone.
    if (!force && cachedStatus && new Date(cachedStatus.checkedAt).toDateString() === new Date().toDateString()) {
        const updateAvailable = cachedStatus.latestVersion ? isNewer(cachedStatus.latestVersion, installedVersion) : false;
        return {
            ...cachedStatus,
            installedVersion,
            capabilities,
            updateAvailable,
            state: cachedStatus.state === "failed" ? "failed" : updateAvailable ? "available" : "current",
        };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(GITHUB_RELEASES_URL, {
            headers: { Accept: "application/vnd.github+json", "User-Agent": "HomeLab-Portal" },
            signal: controller.signal,
        });
        if (!response.ok)
            throw new Error(`GitHub returned ${response.status}`);
        const release = (await response.json());
        const latestVersion = typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : "";
        const version = parseVersion(latestVersion);
        if (!version || release.prerelease === true)
            throw new Error("No stable release found");
        cachedStatus = {
            state: isNewer(latestVersion, installedVersion) ? "available" : "current",
            installedVersion,
            latestVersion,
            updateAvailable: isNewer(latestVersion, installedVersion),
            releaseUrl: typeof release.html_url === "string" ? release.html_url : undefined,
            releaseName: typeof release.name === "string" ? release.name : undefined,
            checkedAt: new Date().toISOString(),
            capabilities,
        };
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[update-check] GitHub release check failed: ${reason}`);
        cachedStatus = {
            state: "failed",
            installedVersion,
            updateAvailable: false,
            checkedAt: new Date().toISOString(),
            capabilities,
            errorCode: "UPDATE_CHECK_FAILED",
            error: "GitHub-Version konnte nicht geprüft werden.",
        };
    }
    finally {
        clearTimeout(timeout);
    }
    await saveStatus(cachedStatus);
    return cachedStatus;
}
