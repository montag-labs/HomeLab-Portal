import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";

const COOKIE_NAME = "homelab_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD_STORE_FILE = process.env.ADMIN_PASSWORD_STORE_FILE
  ?? path.resolve(__dirname, "../../data/admin-password");
interface Session { csrfToken: string; expiresAt: number }
const sessions = new Map<string, Session>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function readAdminPassword(): Promise<string | undefined> {
  try {
    return (await readFile(PASSWORD_STORE_FILE, "utf8")).trim() || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const file = process.env.ADMIN_PASSWORD_FILE;
  if (file) {
    try { return (await readFile(file, "utf8")).trim() || undefined; }
    catch { return undefined; }
  }
  return process.env.ADMIN_PASSWORD?.trim() || undefined;
}

async function writeAdminPassword(password: string): Promise<void> {
  const directory = path.dirname(PASSWORD_STORE_FILE);
  const temporaryFile = `${PASSWORD_STORE_FILE}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporaryFile, `${password}\n`, { encoding: "utf8", mode: 0o600 });
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
  return { id, session };
}

function cookieOptions(request: Request): string {
  const secure = request.secure || process.env.FORCE_SECURE_COOKIES === "true";
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? "; Secure" : ""}`;
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
  const configured = Boolean(await readAdminPassword());
  const authenticated = getSession(request);
  response.json({ configured, authenticated: Boolean(authenticated), csrfToken: authenticated?.session.csrfToken });
});

authRouter.post("/auth/login", async (request, response) => {
  const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(address);
  if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_ATTEMPTS) {
    return response.status(429).json({ error: "Too many login attempts" });
  }
  const expected = await readAdminPassword();
  const supplied = typeof request.body?.password === "string" ? request.body.password : "";
  if (!expected || !constantTimeEqual(supplied, expected)) {
    const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    current.count += 1;
    loginAttempts.set(address, current);
    return response.status(expected ? 401 : 503).json({
      error: expected ? "Invalid credentials" : "Admin authentication is not configured",
    });
  }
  loginAttempts.delete(address);
  const id = randomBytes(32).toString("base64url");
  const session = { csrfToken: randomBytes(32).toString("base64url"), expiresAt: now + SESSION_TTL_MS };
  sessions.set(id, session);
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(id)}; ${cookieOptions(request)}`);
  response.json({ configured: true, authenticated: true, csrfToken: session.csrfToken });
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
  const expected = await readAdminPassword();
  if (!expected || !constantTimeEqual(currentPassword, expected)) {
    return response.status(403).json({ error: "Current password is incorrect" });
  }
  if (newPassword.length < 12 || newPassword.length > 256) {
    return response.status(400).json({ error: "New password must contain between 12 and 256 characters" });
  }
  if (constantTimeEqual(newPassword, expected)) {
    return response.status(400).json({ error: "New password must be different" });
  }
  await writeAdminPassword(newPassword);

  const authenticated = response.locals.adminSession as { id: string; session: Session };
  sessions.clear();
  authenticated.session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(authenticated.id, authenticated.session);
  response.status(204).send();
});
