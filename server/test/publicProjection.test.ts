import express from "express";
import request from "supertest";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { UpdateStatus } from "../src/types.js";

const fullStatus: UpdateStatus = {
  state: "available",
  installedVersion: "1.7.3",
  latestVersion: "1.8.0",
  updateAvailable: true,
  releaseUrl: "https://github.com/example/releases/v1.8.0",
  releaseName: "v1.8.0",
  lastAttemptAt: "2026-11-26T10:00:00.000Z",
  nextCheckAt: "2026-11-26T10:01:00.000Z",
  checkedAt: "2026-11-26T10:00:00.000Z",
  capabilities: { mode: "lxc", canUpdate: true, reason: "" },
  errorCode: "UPDATE_CHECK_FAILED",
  error: "GitHub-Version konnte nicht geprüft werden.",
};

vi.mock("../src/services/updateService.js", () => ({ getUpdateStatus: async () => ({ ...fullStatus }) }));

const { updateRouter } = await import("../src/routes/update.js");
const { publicReachability } = await import("../src/routes/status.js");
const { warnAboutUntrustedProxy } = await import("../src/middleware/security.js");

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TRUST_PROXY;
});

describe("public update status", () => {
  test("hides release details and error texts from visitors", async () => {
    const app = express();
    app.use(updateRouter);

    const response = await request(app).get("/update");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ state: "available", installedVersion: "1.7.3", updateAvailable: true, errorCode: "UPDATE_CHECK_FAILED" });
    for (const field of ["latestVersion", "releaseUrl", "releaseName", "lastAttemptAt", "nextCheckAt", "error"]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });

  test("ignores malformed cookies of other apps", async () => {
    const app = express();
    app.use(updateRouter);

    const response = await request(app).get("/update").set("Cookie", "grafana_session=%E0%A4%A; other=ok");

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("releaseUrl");
  });
});

describe("public reachability", () => {
  test("drops raw error messages", () => {
    expect(publicReachability({ online: false, method: "HEAD", error: "connect ECONNREFUSED 192.168.1.5:443" }))
      .toEqual({ online: false, method: "HEAD" });
  });
});

describe("proxy warning", () => {
  test("warns once when forwarded headers arrive without TRUST_PROXY", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(warnAboutUntrustedProxy);
    app.get("/", (_request, response) => response.sendStatus(204));

    await request(app).get("/");
    expect(warn).not.toHaveBeenCalled();
    await request(app).get("/").set("X-Forwarded-For", "203.0.113.7");
    await request(app).get("/").set("X-Forwarded-For", "203.0.113.8");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("TRUST_PROXY");
  });
});
