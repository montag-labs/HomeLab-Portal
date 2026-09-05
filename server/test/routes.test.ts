import express from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { requireAdmin } from "../src/middleware/auth.js";
import { limitStatusRequests } from "../src/middleware/security.js";
import { configRouter } from "../src/routes/config.js";

function createApp() {
  const app = express();
  app.use(express.json());
  return app;
}

describe("public and admin route boundaries", () => {
  test("serves the portal configuration without authentication", async () => {
    const app = createApp();
    app.use(configRouter);

    const response = await request(app).get("/config");

    expect(response.status).toBe(200);
  });

  test("rejects configuration writes without an admin session", async () => {
    const app = createApp();
    app.use(configRouter);

    const response = await request(app).put("/config").send({});

    expect(response.status).toBe(401);
  });

  test("rejects unauthenticated admin routes", async () => {
    const app = createApp();
    app.get("/admin-only", requireAdmin, (_request, response) => response.sendStatus(204));

    const response = await request(app).get("/admin-only");

    expect(response.status).toBe(401);
  });
});

describe("status rate limiting", () => {
  test("limits a client after 120 status requests", async () => {
    const app = createApp();
    app.use(limitStatusRequests);
    app.get("/status", (_request, response) => response.sendStatus(204));

    for (let index = 0; index < 120; index += 1) {
      const response = await request(app).get("/status");
      expect(response.status).toBe(204);
    }

    const response = await request(app).get("/status");
    expect(response.status).toBe(429);
  });
});