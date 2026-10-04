import express from "express";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeAll, describe, expect, test } from "vitest";

const directory = await mkdtemp(path.join(os.tmpdir(), "homelab-auth-"));
const storeFile = path.join(directory, "admin-password");
process.env.ADMIN_PASSWORD_STORE_FILE = storeFile;
delete process.env.ADMIN_PASSWORD_FILE;
process.env.ADMIN_PASSWORD = "bootstrap-password-123";

const { authRouter, requireAdmin } = await import("../src/middleware/auth.js");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  app.get("/admin-only", requireAdmin, (_req, res) => res.sendStatus(204));
  app.post("/admin-only", requireAdmin, (_req, res) => res.sendStatus(204));
  return app;
}

async function login(app: express.Express, password: string, ip = "10.0.0.1") {
  return request(app).post("/auth/login").set("X-Forwarded-For", ip).send({ password });
}

function cookieOf(response: request.Response): string {
  return (response.headers["set-cookie"] as unknown as string[])[0].split(";")[0];
}

describe("admin authentication", () => {
  const app = createApp();

  beforeAll(() => {
    app.set("trust proxy", true);
  });

  test("rejects wrong credentials and accepts the bootstrap password", async () => {
    expect((await login(app, "wrong-password", "10.0.0.2")).status).toBe(401);
    const ok = await login(app, "bootstrap-password-123", "10.0.0.3");
    expect(ok.status).toBe(200);
    expect(ok.body.csrfToken).toBeTruthy();
    expect(ok.headers["set-cookie"][0]).toMatch(/HttpOnly.*SameSite=Strict/);
  });

  test("locks out an address after five failed attempts", async () => {
    for (let index = 0; index < 5; index += 1) {
      expect((await login(app, "nope", "10.0.0.4")).status).toBe(401);
    }
    expect((await login(app, "bootstrap-password-123", "10.0.0.4")).status).toBe(429);
  });

  test("requires a matching CSRF token for state-changing requests", async () => {
    const session = await login(app, "bootstrap-password-123", "10.0.0.5");
    const cookie = cookieOf(session);

    expect((await request(app).get("/admin-only").set("Cookie", cookie)).status).toBe(204);
    expect((await request(app).post("/admin-only").set("Cookie", cookie)).status).toBe(403);
    expect((await request(app).post("/admin-only").set("Cookie", cookie)
      .set("X-CSRF-Token", session.body.csrfToken)).status).toBe(204);
  });

  test("changes the password, stores only a hash and invalidates other sessions", async () => {
    const first = await login(app, "bootstrap-password-123", "10.0.0.6");
    const second = await login(app, "bootstrap-password-123", "10.0.0.7");
    const newPassword = "a-brand-new-password-456";

    const change = await request(app).put("/auth/password").set("Cookie", cookieOf(first))
      .set("X-CSRF-Token", first.body.csrfToken)
      .send({ currentPassword: "bootstrap-password-123", newPassword });
    expect(change.status).toBe(204);

    const stored = await readFile(storeFile, "utf8");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(stored).not.toContain(newPassword);

    expect((await request(app).get("/admin-only").set("Cookie", cookieOf(second))).status).toBe(401);
    expect((await request(app).get("/admin-only").set("Cookie", cookieOf(first))).status).toBe(204);
    expect((await login(app, "bootstrap-password-123", "10.0.0.8")).status).toBe(401);
    expect((await login(app, newPassword, "10.0.0.9")).status).toBe(200);
  });

  test("rejects weak or unchanged passwords", async () => {
    const session = await login(app, "a-brand-new-password-456", "10.0.0.10");
    const send = (body: object) => request(app).put("/auth/password").set("Cookie", cookieOf(session))
      .set("X-CSRF-Token", session.body.csrfToken).send(body);

    expect((await send({ currentPassword: "wrong", newPassword: "another-long-password-1" })).status).toBe(403);
    expect((await send({ currentPassword: "a-brand-new-password-456", newPassword: "short" })).status).toBe(400);
    expect((await send({ currentPassword: "a-brand-new-password-456", newPassword: "a-brand-new-password-456" })).status).toBe(400);
  });

  test("upgrades a legacy plaintext password file to a hash on login", async () => {
    await writeFile(storeFile, "legacy-plaintext-password\n");
    expect((await login(app, "legacy-plaintext-password", "10.0.0.11")).status).toBe(200);
    expect((await readFile(storeFile, "utf8")).startsWith("scrypt:")).toBe(true);
    expect((await login(app, "legacy-plaintext-password", "10.0.0.12")).status).toBe(200);
  });

  test("ends the session on logout", async () => {
    const session = await login(app, "legacy-plaintext-password", "10.0.0.13");
    const cookie = cookieOf(session);
    expect((await request(app).post("/auth/logout").set("Cookie", cookie)
      .set("X-CSRF-Token", session.body.csrfToken)).status).toBe(204);
    expect((await request(app).get("/admin-only").set("Cookie", cookie)).status).toBe(401);
  });
});
