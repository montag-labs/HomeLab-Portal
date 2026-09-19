import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/montag-labs/HomeLab-Portal/releases/latest";
const REQUEST_TIMEOUT_MS = 15_000;
const statusPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/update-status.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPackagePath = path.resolve(__dirname, "../../package.json");
const updateProgressPath = process.env.UPDATE_PROGRESS_FILE ?? "/run/homelab-portal-update/update-progress.json";
let cachedStatus;
let cacheLoad;
let pendingStatus;
async function loadStatus() {
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
    await (cacheLoad ??= loadStatus());
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
    const now = Date.now();
    const snapshot = () => {
        const { etag: _etag, ...value } = cachedStatus;
        const updateAvailable = value.latestVersion ? isNewer(value.latestVersion, installedVersion) : false;
        return {
            ...value, installedVersion, capabilities, updateAvailable,
            state: value.latestVersion ? (updateAvailable ? "available" : "current") : "failed",
            refreshing: Boolean(pendingStatus),
        };
    };
    if (pendingStatus) {
        if (!force && cachedStatus)
            return snapshot();
        await pendingStatus;
        return snapshot();
    }
    const lastAttempt = cachedStatus?.lastAttemptAt ?? cachedStatus?.checkedAt;
    const sameDay = lastAttempt && new Date(lastAttempt).toDateString() === new Date().toDateString();
    const coolingDown = cachedStatus?.nextCheckAt && Date.parse(cachedStatus.nextCheckAt) > now;
    // Only successful checks satisfy the daily cache; failures may retry after backoff.
    const successful = cachedStatus && cachedStatus.state !== "failed" && !cachedStatus.errorCode;
    if (cachedStatus && (coolingDown || (!force && sameDay && successful)))
        return snapshot();
    pendingStatus = checkRelease(installedVersion, capabilities).finally(() => { pendingStatus = undefined; });
    if (cachedStatus && !force)
        return snapshot();
    await pendingStatus;
    return snapshot();
}
async function checkRelease(installedVersion, capabilities) {
    const attemptedAt = new Date().toISOString();
    let nextCheckAt = new Date(Date.now() + 60_000).toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let httpStatus;
    let rateLimitRemaining = null;
    let requestId = null;
    try {
        const headers = {
            Accept: "application/vnd.github+json", "User-Agent": "HomeLab-Portal",
        };
        if (cachedStatus?.etag && cachedStatus.latestVersion)
            headers["If-None-Match"] = cachedStatus.etag;
        const response = await fetch(GITHUB_RELEASES_URL, { headers, signal: controller.signal });
        httpStatus = response.status;
        rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
        requestId = response.headers.get("x-github-request-id");
        if (response.status === 403 || response.status === 429) {
            const retryAfter = response.headers.get("retry-after");
            const reset = response.headers.get("x-ratelimit-reset");
            const retryAt = retryAfter
                ? (/^\d+$/.test(retryAfter) ? Date.now() + Number(retryAfter) * 1000 : Date.parse(retryAfter))
                : 0;
            const resetAt = response.headers.get("x-ratelimit-remaining") === "0" && reset ? Number(reset) * 1000 : 0;
            nextCheckAt = new Date(Math.max(Date.now() + 60_000, Number.isFinite(retryAt) ? retryAt : 0, Number.isFinite(resetAt) ? resetAt : 0)).toISOString();
        }
        if (response.status === 304 && cachedStatus?.latestVersion) {
            cachedStatus = {
                ...cachedStatus, installedVersion, capabilities,
                checkedAt: attemptedAt, lastAttemptAt: attemptedAt, nextCheckAt,
                error: undefined, errorCode: undefined,
            };
        }
        else {
            if (!response.ok)
                throw new Error("GitHub returned " + response.status);
            const release = (await response.json());
            const latestVersion = typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : "";
            if (!parseVersion(latestVersion) || release.prerelease === true)
                throw new Error("No stable release found");
            cachedStatus = {
                state: isNewer(latestVersion, installedVersion) ? "available" : "current",
                installedVersion, latestVersion,
                updateAvailable: isNewer(latestVersion, installedVersion),
                releaseUrl: typeof release.html_url === "string" ? release.html_url : undefined,
                releaseName: typeof release.name === "string" ? release.name : undefined,
                checkedAt: attemptedAt, lastAttemptAt: attemptedAt, nextCheckAt, capabilities,
                etag: response.headers.get("etag") ?? undefined,
            };
        }
    }
    catch (error) {
        console.warn("[update-check] GitHub release check failed:", error);
        const cause = error instanceof Error ? error.cause : undefined;
        const diagnostic = JSON.stringify({
            timestamp: attemptedAt, event: "update-check", outcome: "failed",
            url: GITHUB_RELEASES_URL, httpStatus, rateLimitRemaining, requestId,
            reason: controller.signal.aborted ? "TIMEOUT" : error instanceof Error ? error.message : "Unknown error",
            networkCode: typeof cause?.code === "string" ? cause.code : undefined,
            timeoutMs: REQUEST_TIMEOUT_MS, nextCheckAt,
        });
        console.warn("[update-check]", diagnostic);
        try {
            const logDir = process.env.LOG_DIR ?? "/var/log/homelab-portal";
            await mkdir(logDir, { recursive: true });
            await appendFile(path.join(logDir, "homelab-portal-service.log"), diagnostic + "\n", { mode: 0o640 });
        }
        catch (logError) {
            console.warn("[update-check] Could not write service log:", logError);
        }
        cachedStatus = {
            ...cachedStatus,
            state: cachedStatus?.latestVersion
                ? (isNewer(cachedStatus.latestVersion, installedVersion) ? "available" : "current") : "failed",
            installedVersion, capabilities,
            updateAvailable: cachedStatus?.latestVersion ? isNewer(cachedStatus.latestVersion, installedVersion) : false,
            checkedAt: cachedStatus?.checkedAt ?? attemptedAt,
            lastAttemptAt: attemptedAt, nextCheckAt,
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
