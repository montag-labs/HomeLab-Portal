import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import {
  completeOidcAuthorization,
  createOidcAuthorizationUrl,
  getAdminOidcConfig,
  getOidcStatus,
  updateAdminOidcConfig,
} from "../services/oidcService.js";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const HASH_PREFIX = "scrypt:";
const HASH_BYTES = 64;
const COOKIE_NAME = "homelab_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS = 5;
const MAX_SESSIONS = 1_000;
const MAX_LOGIN_ATTEMPTS = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD_STORE_FILE = process.env.ADMIN_PASSWORD_STORE_FILE
  ?? path.resolve(__dirname, "../../data/admin-password");
interface Session {
  csrfToken: string;
  expiresAt: number;
  authMethod: "password" | "oidc";
  subject?: string;
  displayName?: string;
}
const sessions = new Map<string, Session>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function setBounded<T>(map: Map<string, T>, key: string, value: T, limit: number): void {
  map.delete(key);
  while (map.size >= limit) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  map.set(key, value);
}

function removeExpiredEntries(now = Date.now()): void {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
  for (const [address, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(address);
  }
}

const cleanupTimer = setInterval(removeExpiredEntries, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, HASH_BYTES);
  return `${HASH_PREFIX}${salt.toString("base64")}:${hash.toString("base64")}`;
}

async function matchesHash(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.slice(HASH_PREFIX.length).split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readStoredPassword(): Promise<string | undefined> {
  try {
    return (await readFile(PASSWORD_STORE_FILE, "utf8")).trim() || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return undefined;
}

async function readBootstrapPassword(): Promise<string | undefined> {
  const file = process.env.ADMIN_PASSWORD_FILE;
  if (file) {
    try { return (await readFile(file, "utf8")).trim() || undefined; }
    catch { return undefined; }
  }
  return process.env.ADMIN_PASSWORD?.trim() || undefined;
}

async function isPasswordConfigured(): Promise<boolean> {
  return Boolean((await readStoredPassword()) ?? (await readBootstrapPassword()));
}

/** Checks a password against the stored hash, falling back to the ADMIN_PASSWORD bootstrap value. */
async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const stored = await readStoredPassword();
  if (stored?.startsWith(HASH_PREFIX)) return matchesHash(candidate, stored);
  if (stored !== undefined) {
    // Legacy plaintext store: upgrade to a hash after the first successful check.
    if (!constantTimeEqual(candidate, stored)) return false;
    await writeAdminPassword(candidate);
    return true;
  }
  const bootstrap = await readBootstrapPassword();
  return bootstrap !== undefined && constantTimeEqual(candidate, bootstrap);
}

async function writeAdminPassword(password: string): Promise<void> {
  const directory = path.dirname(PASSWORD_STORE_FILE);
  const temporaryFile = `${PASSWORD_STORE_FILE}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporaryFile, `${await hashPassword(password)}
`, { encoding: "utf8", mode: 0o600 });
  try {
    await rename(temporaryFile, PASSWORD_STORE_FILE);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

function parseCookies(request: Request): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function getSession(request: Request): { id: string; session: Session } | undefined {
  const id = parseCookies(request)[COOKIE_NAME];
  if (!id) return undefined;
  const session = sessions.get(id);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return undefined;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.delete(id);
  sessions.set(id, session);
  return { id, session };
}

function cookieOptions(request: Request): string {
  const secure = request.secure || process.env.FORCE_SECURE_COOKIES === "true";
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? "; Secure" : ""}`;
}

function createAdminSession(
  request: Request,
  response: Response,
  authMethod: Session["authMethod"],
  identity?: { subject: string; displayName?: string },
): Session {
  const id = randomBytes(32).toString("base64url");
  const session: Session = {
    csrfToken: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + SESSION_TTL_MS,
    authMethod,
    ...identity,
  };
  setBounded(sessions, id, session, MAX_SESSIONS);
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(id)}; ${cookieOptions(request)}`);
  return session;
}

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const authenticated = getSession(request);
  if (!authenticated) return response.status(401).json({ error: "Authentication required" });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const candidate = request.get("x-csrf-token") ?? "";
    if (!constantTimeEqual(candidate, authenticated.session.csrfToken)) {
      return response.status(403).json({ error: "Invalid CSRF token" });
    }
  }
  response.locals.adminSession = authenticated;
  next();
}

export const authRouter = Router();

authRouter.get("/auth/session", async (request, response) => {
  const passwordConfigured = await isPasswordConfigured();
  const oidcStatus = await getOidcStatus();
  const passwordEnabled = passwordConfigured && !oidcStatus.passwordLoginDisabled;
  const authenticated = getSession(request);
  response.json({
    configured: passwordEnabled || oidcStatus.enabled,
    passwordEnabled,
    ssoEnabled: oidcStatus.enabled,
    ssoLabel: oidcStatus.label,
    authenticated: Boolean(authenticated),
    authMethod: authenticated?.session.authMethod,
    displayName: authenticated?.session.displayName,
    csrfToken: authenticated?.session.csrfToken,
  });
});

authRouter.post("/auth/login", async (request, response) => {
  if ((await getOidcStatus()).passwordLoginDisabled) {
    return response.status(403).json({ error: "Password login is disabled" });
  }
  const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(address);
  if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_ATTEMPTS) {
    return response.status(429).json({ error: "Too many login attempts" });
  }
  const configured = await isPasswordConfigured();
  const supplied = typeof request.body?.password === "string" ? request.body.password : "";
  if (!configured || !(await verifyAdminPassword(supplied))) {
    const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    current.count += 1;
    setBounded(loginAttempts, address, current, MAX_LOGIN_ATTEMPTS);
    return response.status(configured ? 401 : 503).json({
      error: configured ? "Invalid credentials" : "Admin authentication is not configured",
    });
  }
  loginAttempts.delete(address);
  const previousSession = getSession(request);
  if (previousSession) sessions.delete(previousSession.id);
  const session = createAdminSession(request, response, "password");
  const oidcStatus = await getOidcStatus();
  response.json({
    configured: true,
    passwordEnabled: true,
    ssoEnabled: oidcStatus.enabled,
    ssoLabel: oidcStatus.label,
    authenticated: true,
    authMethod: session.authMethod,
    csrfToken: session.csrfToken,
  });
});

authRouter.get("/auth/oidc/login", async (_request, response) => {
  try {
    response.redirect((await createOidcAuthorizationUrl()).href);
  } catch (error) {
    console.error("OIDC authorization could not be started:", error instanceof Error ? error.message : error);
    response.redirect("/admin?sso_error=unavailable");
  }
});

authRouter.get("/auth/oidc/callback", async (request, response) => {
  try {
    const callbackUrl = new URL(request.originalUrl, "http://localhost");
    const identity = await completeOidcAuthorization(callbackUrl);
    const previousSession = getSession(request);
    if (previousSession) sessions.delete(previousSession.id);
    createAdminSession(request, response, "oidc", identity);
    response.redirect("/admin?sso_verified=1");
  } catch (error) {
    console.error("OIDC authorization failed:", error instanceof Error ? error.message : error);
    response.redirect("/admin?sso_error=failed");
  }
});

authRouter.get("/auth/oidc/config", requireAdmin, async (_request, response) => {
  response.json(await getAdminOidcConfig());
});

authRouter.put("/auth/oidc/config", requireAdmin, async (request, response) => {
  try {
    response.json(await updateAdminOidcConfig(request.body));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Invalid OIDC configuration" });
  }
});

authRouter.post("/auth/logout", requireAdmin, (_request, response) => {
  const authenticated = response.locals.adminSession as { id: string } | undefined;
  if (authenticated) sessions.delete(authenticated.id);
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  response.status(204).send();
});

authRouter.put("/auth/password", requireAdmin, async (request, response) => {
  const currentPassword = typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
  const newPassword = typeof request.body?.newPassword === "string" ? request.body.newPassword : "";
  if (!(await verifyAdminPassword(currentPassword))) {
    return response.status(403).json({ error: "Current password is incorrect" });
  }
  if (newPassword.length < 12 || newPassword.length > 256) {
    return response.status(400).json({ error: "New password must contain between 12 and 256 characters" });
  }
  if (constantTimeEqual(newPassword, currentPassword)) {
    return response.status(400).json({ error: "New password must be different" });
  }
  await writeAdminPassword(newPassword);

  const authenticated = response.locals.adminSession as { id: string; session: Session };
  sessions.clear();
  authenticated.session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(authenticated.id, authenticated.session);
  response.status(204).send();
});
