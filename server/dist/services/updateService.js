import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/montag-labs/HomeLab-Portal/releases/latest";
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TIME_MS = 5 * 60 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPackagePath = path.resolve(__dirname, "../../package.json");
const updateProgressPath = process.env.UPDATE_PROGRESS_FILE ?? "/run/homelab-portal-update/update-progress.json";
let cachedStatus;
let cachedAt = 0;
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
    const progress = await readUpdateProgress();
    if (progress) {
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
    if (!force && cachedStatus && Date.now() - cachedAt < CACHE_TIME_MS) {
        return cachedStatus;
    }
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
            error: "Installierte Version konnte nicht ermittelt werden.",
        };
    }
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch(GITHUB_RELEASES_URL, {
            headers: { Accept: "application/vnd.github+json", "User-Agent": "HomeLab-Portal" },
            signal: controller.signal,
        });
        clearTimeout(timeout);
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
    catch {
        cachedStatus = {
            state: "failed",
            installedVersion,
            updateAvailable: false,
            checkedAt: new Date().toISOString(),
            capabilities,
            error: "GitHub-Version konnte nicht geprüft werden.",
        };
    }
    cachedAt = Date.now();
    return cachedStatus;
}
