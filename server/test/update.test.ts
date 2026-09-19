import { afterEach, beforeEach, expect, it, vi } from "vitest";

const disk = vi.hoisted(() => ({ saved: "", version: "1.0.0" }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async (file: string) => {
    if (file.endsWith("package.json")) return JSON.stringify({ version: disk.version });
    if (file.endsWith("update-status.json") && disk.saved) return disk.saved;
    throw new Error("ENOENT");
  }),
  mkdir: vi.fn(),
  appendFile: vi.fn(),
  writeFile: vi.fn(async (_file: string, contents: string) => { disk.saved = contents; }),
  rename: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  disk.saved = "";
  disk.version = "1.0.0";
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 9, 10));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, headers: new Headers({ etag: '"release-1"' }), json: async () => ({ tag_name: "v1.1.0" }),
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("persists the result and reuses it after restart on the same day", async () => {
  let service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus()).state).toBe("available");
  expect(JSON.parse(disk.saved).latestVersion).toBe("1.1.0");
  vi.resetModules();
  service = await import("../src/services/updateService.js");
  await service.getUpdateStatus();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("checks once on the next calendar day and coalesces concurrent requests", async () => {
  const service = await import("../src/services/updateService.js");
  await Promise.all([service.getUpdateStatus(), service.getUpdateStatus()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date(2026, 8, 10, 0, 1));
  await Promise.all([service.getUpdateStatus(), service.getUpdateStatus()]);
  expect(fetch).toHaveBeenCalledTimes(2);
  await service.getUpdateStatus(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date(2026, 8, 10, 0, 3));
  await service.getUpdateStatus(true);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("persists failures and suppresses automatic attempts during cooldown", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  const service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus()).state).toBe("failed");
  vi.resetModules();
  await (await import("../src/services/updateService.js")).getUpdateStatus();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("recalculates availability after installing a version and refreshes capabilities", async () => {
  const service = await import("../src/services/updateService.js");
  await service.getUpdateStatus();
  disk.version = "1.1.0";
  expect((await service.getUpdateStatus()).state).toBe("current");
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("recovers from an invalid cache", async () => {
  disk.saved = "{broken";
  const service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus()).state).toBe("available");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("revalidates with a persisted ETag and handles 304 without reading a body", async () => {
  let service = await import("../src/services/updateService.js");
  await service.getUpdateStatus();
  vi.resetModules();
  service = await import("../src/services/updateService.js");
  vi.setSystemTime(new Date(2026, 8, 10, 10));
  const json = vi.fn();
  vi.mocked(fetch).mockResolvedValue({ status: 304, ok: false, headers: new Headers(), json } as unknown as Response);
  const status = await service.getUpdateStatus(true);
  expect(status.state).toBe("available");
  expect(status.checkedAt).toBe(new Date().toISOString());
  expect(status).not.toHaveProperty("etag");
  expect(vi.mocked(fetch).mock.lastCall?.[1]?.headers).toMatchObject({ "If-None-Match": '"release-1"' });
  expect(json).not.toHaveBeenCalled();
});

it("returns cached data immediately while a single background check is pending", async () => {
  const service = await import("../src/services/updateService.js");
  await service.getUpdateStatus();
  vi.setSystemTime(new Date(2026, 8, 10, 10));
  let finish!: (response: Response) => void;
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const cached = await service.getUpdateStatus();
  expect(cached).toMatchObject({ refreshing: true, latestVersion: "1.1.0" });
  expect((await service.getUpdateStatus()).refreshing).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  finish({ ok: true, headers: new Headers(), json: async () => ({ tag_name: "v1.2.0" }) } as Response);
  expect(await service.getUpdateStatus(true)).toMatchObject({ refreshing: false, latestVersion: "1.2.0" });
});

it("retains the last successful result and its date after a failed refresh", async () => {
  let service = await import("../src/services/updateService.js");
  const previous = await service.getUpdateStatus();
  vi.setSystemTime(new Date(2026, 8, 10, 10));
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  expect(await service.getUpdateStatus(true)).toMatchObject({
    state: "available", latestVersion: "1.1.0", checkedAt: previous.checkedAt,
    errorCode: "UPDATE_CHECK_FAILED", lastAttemptAt: new Date().toISOString(),
  });
  vi.resetModules();
  service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus()).latestVersion).toBe("1.1.0");
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date(2026, 8, 10, 10, 2));
  vi.mocked(fetch).mockResolvedValue({ status: 304, headers: new Headers() } as Response);
  expect((await service.getUpdateStatus(true)).errorCode).toBeUndefined();
});

it.each([
  [429, { "retry-after": "3600" }],
  [429, { "retry-after": new Date(2026, 8, 9, 11).toUTCString() }],
  [403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(new Date(2026, 8, 9, 11).getTime() / 1000) }],
])("persists GitHub backoff for %s, including across restarts", async (status, headers) => {
  vi.mocked(fetch).mockResolvedValue({ ok: false, status, headers: new Headers(headers as Record<string, string>) } as Response);
  let service = await import("../src/services/updateService.js");
  const result = await service.getUpdateStatus(true);
  expect(result.nextCheckAt).toBe(new Date(2026, 8, 9, 11).toISOString());
  vi.resetModules();
  service = await import("../src/services/updateService.js");
  vi.setSystemTime(new Date(2026, 8, 9, 10, 30));
  await service.getUpdateStatus(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date(2026, 8, 9, 11, 1));
  await service.getUpdateStatus(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("coalesces manual requests and enforces a persistent one-minute cooldown", async () => {
  const service = await import("../src/services/updateService.js");
  await Promise.all([service.getUpdateStatus(true), service.getUpdateStatus(true)]);
  await service.getUpdateStatus(true);
  vi.resetModules();
  await (await import("../src/services/updateService.js")).getUpdateStatus(true);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("automatically retries a persisted failed check after cooldown on the same day", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  let service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus()).state).toBe("failed");
  vi.resetModules();
  service = await import("../src/services/updateService.js");
  vi.setSystemTime(new Date(2026, 8, 9, 10, 2));
  await service.getUpdateStatus();
  expect(fetch).toHaveBeenCalledTimes(2);
  await vi.waitFor(async () => {
    expect(await service.getUpdateStatus()).toMatchObject({
      state: "available", latestVersion: "1.1.0", refreshing: false,
    });
  });
  expect((await service.getUpdateStatus()).errorCode).toBeUndefined();
  await service.getUpdateStatus();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("automatically retries a failed refresh even with a successful cached version", async () => {
  const service = await import("../src/services/updateService.js");
  await service.getUpdateStatus();
  vi.setSystemTime(new Date(2026, 8, 10, 10));
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  await service.getUpdateStatus(true);
  vi.setSystemTime(new Date(2026, 8, 10, 10, 2));
  await service.getUpdateStatus();
  expect(fetch).toHaveBeenCalledTimes(3);
  await vi.waitFor(async () => {
    expect((await service.getUpdateStatus()).errorCode).toBeUndefined();
  });
});
it("logs HTTP failures to the service log with retry details", async () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: false, status: 429, headers: new Headers({ "retry-after": "3600", "x-github-request-id": "test-id" }),
  } as Response);
  const service = await import("../src/services/updateService.js");
  const result = await service.getUpdateStatus(true);
  const { appendFile } = await import("node:fs/promises");
  const line = vi.mocked(appendFile).mock.lastCall?.[1] as string;
  expect(JSON.parse(line)).toMatchObject({
    event: "update-check", httpStatus: 429, requestId: "test-id", nextCheckAt: result.nextCheckAt,
  });
});

it("records the network cause and survives an unwritable service log", async () => {
  const { appendFile } = await import("node:fs/promises");
  vi.mocked(appendFile).mockRejectedValueOnce(new Error("EACCES"));
  vi.mocked(fetch).mockRejectedValue(new Error("fetch failed", { cause: { code: "ENOTFOUND" } }));
  const service = await import("../src/services/updateService.js");
  expect((await service.getUpdateStatus(true)).state).toBe("failed");
  expect(JSON.parse(vi.mocked(appendFile).mock.lastCall?.[1] as string)).toMatchObject({
    networkCode: "ENOTFOUND",
  });
});
