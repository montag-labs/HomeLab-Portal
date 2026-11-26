import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_STATUS_REQUESTS = 120;
const MAX_STATUS_CLIENTS = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const statusRequests = new Map<string, { count: number; resetAt: number }>();

function removeExpiredStatusRequests(now = Date.now()): void {
  for (const [address, entry] of statusRequests) {
    if (entry.resetAt <= now) statusRequests.delete(address);
  }
}

function setBoundedStatusRequest(address: string, entry: { count: number; resetAt: number }): void {
  statusRequests.delete(address);
  while (statusRequests.size >= MAX_STATUS_CLIENTS) {
    const oldestAddress = statusRequests.keys().next().value;
    if (oldestAddress === undefined) break;
    statusRequests.delete(oldestAddress);
  }
  statusRequests.set(address, entry);
}

const cleanupTimer = setInterval(removeExpiredStatusRequests, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

export function securityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; connect-src 'self'; frame-src http: https:",
  );
  next();
}

let proxyWarningShown = false;

/**
 * Login and status limits are counted per client IP. Behind a reverse proxy without TRUST_PROXY
 * every visitor shares the proxy's address, so a few failed logins by anyone would lock the admin out.
 */
export function warnAboutUntrustedProxy(request: Request, _response: Response, next: NextFunction) {
  if (!proxyWarningShown && process.env.TRUST_PROXY !== "true" && request.headers["x-forwarded-for"]) {
    proxyWarningShown = true;
    console.warn(
      "[security] Request with X-Forwarded-For received, but TRUST_PROXY is not set. "
      + "Login and status limits then apply to the proxy address shared by all visitors. "
      + "Set TRUST_PROXY=true if the portal is only reachable through this proxy.",
    );
  }
  next();
}

export function limitStatusRequests(request: Request, response: Response, next: NextFunction) {
  const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const current = statusRequests.get(address);
  const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_MS };
  entry.count += 1;
  setBoundedStatusRequest(address, entry);
  response.setHeader("RateLimit-Remaining", String(Math.max(0, MAX_STATUS_REQUESTS - entry.count)));
  if (entry.count > MAX_STATUS_REQUESTS) return response.status(429).json({ error: "Too many status requests" });
  next();
}
