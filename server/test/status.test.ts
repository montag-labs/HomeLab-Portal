import express from "express";
import http from "node:http";
import request from "supertest";
import { afterEach, expect, test, vi } from "vitest";
import { statusRouter } from "../src/routes/status.js";
import { dashboardStore, emptyDashboard } from "../src/services/deviceDashboard.js";
vi.mock("../src/services/configStore.js", () => ({ readConfig: async () => ({ categories: [] }) }));
afterEach(() => vi.restoreAllMocks());
test("checks public device links without login and excludes unplaced inventory", async () => {
  const target = http.createServer((_req, res) => { res.writeHead(401); res.end(); });
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  try {
    const address = target.address() as import("node:net").AddressInfo;
    const url = "http://127.0.0.1:" + address.port;
    const hiddenUrl = url + "/private";
    vi.spyOn(dashboardStore, "read").mockResolvedValue({
      ...emptyDashboard(),
      devices: [
        { id: "visible", name: "Visible", url, source: "manual", icon: "device" },
        { id: "hidden", name: "Hidden", url: hiddenUrl, source: "manual", icon: "device" },
      ],
      tiles: [{ id: "tile", deviceId: "visible", groupId: null, x: 0, y: 0, w: 1, h: 1 }],
    });
    const app = express();
    app.use(statusRouter);
    const snapshot = await request(app).get("/statuses");
    expect(snapshot.status).toBe(200);
    expect(snapshot.body.results).toEqual({
      [new URL(url).href]: { online: true, method: "HEAD", statusCode: 401 },
    });
    const single = await request(app).get("/status").query({ url });
    expect(single.status).toBe(200);
    expect(single.body.online).toBe(true);
    expect((await request(app).get("/status").query({ url: hiddenUrl })).status).toBe(403);
    expect((await request(app).get("/status").query({ url: "http://example.invalid" })).status).toBe(403);
  } finally {
    await new Promise<void>((resolve, reject) => target.close(error => error ? reject(error) : resolve()));
  }
});
