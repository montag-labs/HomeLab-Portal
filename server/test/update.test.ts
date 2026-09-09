import { afterEach, beforeEach, expect, it, vi } from "vitest";

const disk = vi.hoisted(() => ({ saved: "", version: "1.0.0" }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async (file: string) => {
    if (file.endsWith("package.json")) return JSON.stringify({ version: disk.version });
    if (file.endsWith("update-status.json") && disk.saved) return disk.saved;
    throw new Error("ENOENT");
  }),
  mkdir: vi.fn(),
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
    ok: true, json: async () => ({ tag_name: "v1.1.0" }),
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
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("persists failures without repeated automatic attempts that day", async () => {
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