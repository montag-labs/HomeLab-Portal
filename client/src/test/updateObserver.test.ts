import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../api";

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const response = (refreshing: boolean) => ({ ok: true, json: async () => ({ refreshing, latestVersion: "1.2.0" }) }) as Response;

it("shows cached data then fetches the completed background result once", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response(true)).mockResolvedValue(response(false));
  const receive = vi.fn();
  const stop = api.observeUpdateStatus(receive);
  await vi.advanceTimersByTimeAsync(0);
  expect(receive).toHaveBeenCalledWith({ refreshing: true, latestVersion: "1.2.0" });
  await vi.advanceTimersByTimeAsync(6000);
  expect(receive).toHaveBeenLastCalledWith({ refreshing: false, latestVersion: "1.2.0" });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetch).toHaveBeenCalledTimes(2);
  stop();
});

it("stops follow-ups on unmount and never polls idle status", async () => {
  vi.mocked(fetch).mockResolvedValue(response(true));
  const stop = api.observeUpdateStatus(vi.fn());
  await vi.advanceTimersByTimeAsync(0);
  stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValue(response(false));
  const stopIdle = api.observeUpdateStatus(vi.fn());
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetch).toHaveBeenCalledTimes(2);
  stopIdle();
});

it("bounds follow-ups even when the server continues to report refreshing", async () => {
  vi.mocked(fetch).mockResolvedValue(response(true));
  const stop = api.observeUpdateStatus(vi.fn());
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetch).toHaveBeenCalledTimes(4);
  stop();
});

it("keeps the displayed result when a follow-up fails", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response(true)).mockRejectedValue(new Error("offline"));
  const receive = vi.fn();
  const stop = api.observeUpdateStatus(receive);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(receive).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  stop();
});