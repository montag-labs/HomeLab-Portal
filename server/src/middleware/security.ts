import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_STATUS_REQUESTS = 120;
const statusRequests = new Map<string, { count: number; resetAt: number }>();

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

export function limitStatusRequests(request: Request, response: Response, next: NextFunction) {
  const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const current = statusRequests.get(address);
  const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_MS };
  entry.count += 1;
  statusRequests.set(address, entry);
  response.setHeader("RateLimit-Remaining", String(Math.max(0, MAX_STATUS_REQUESTS - entry.count)));
  if (entry.count > MAX_STATUS_REQUESTS) return response.status(429).json({ error: "Too many status requests" });
  next();
}
