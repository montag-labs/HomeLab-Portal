import { EventEmitter } from "node:events";
import https from "node:https";
import { afterEach, describe, expect, test, vi } from "vitest";
import { appEntrySchema } from "../src/schemas.js";
import { checkReachability, getConfiguredUrls } from "../src/routes/status.js";
import { dashboardStore, emptyDashboard } from "../src/services/deviceDashboard.js";

vi.mock("../src/services/configStore.js", () => ({
  readConfig: async () => ({
    categories: [{
      id: "c",
      apps: [
        {
          id: "proxmox",
          domain: "https://proxmox.example.com/",
          domainInsecureTls: false,
          localIp: "https://192.168.1.10:8006",
          localIpInsecureTls: true,
        },
        { id: "plain", localIp: "http://192.168.1.20", localIpInsecureTls: true },
      ],
    }],
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALLOW_INSECURE_TLS;
});

function captureTlsOption(): { value: boolean | undefined } {
  const captured: { value: boolean | undefined } = { value: undefined };
  vi.spyOn(https, "request").mockImplementation(((_url: unknown, options: { rejectUnauthorized?: boolean }, callback: (res: unknown) => void) => {
    captured.value = options.rejectUnauthorized;
    const request = Object.assign(new EventEmitter(), {
      end: () => callback({ statusCode: 200, resume: () => undefined }),
      destroy: () => undefined,
    });
    return request;
  }) as unknown as typeof https.request);
  return captured;
}

describe("per-app insecure TLS", () => {
  test("validates and normalizes the flags", () => {
    const base = { id: "a", name: "A", order: 0 };
    expect(appEntrySchema.parse({ ...base, localIpInsecureTls: true }).localIpInsecureTls).toBe(true);
    expect(appEntrySchema.parse({ ...base, localIpInsecureTls: false }).localIpInsecureTls).toBeUndefined();
    expect(appEntrySchema.safeParse({ ...base, localIpInsecureTls: "yes" }).success).toBe(false);
  });

  test("verifies certificates by default", async () => {
    const captured = captureTlsOption();
    await checkReachability("https://192.168.1.10:8006");
    expect(captured.value).toBe(true);
  });

  test("skips verification only when requested for that URL", async () => {
    const captured = captureTlsOption();
    await checkReachability("https://192.168.1.10:8006", true);
    expect(captured.value).toBe(false);
  });

  test("still honours the global ALLOW_INSECURE_TLS switch", async () => {
    process.env.ALLOW_INSECURE_TLS = "true";
    const captured = captureTlsOption();
    await checkReachability("https://192.168.1.10:8006");
    expect(captured.value).toBe(false);
  });

  test("collects flagged HTTPS URLs from the configuration", async () => {
    vi.spyOn(dashboardStore, "read").mockResolvedValue(emptyDashboard());
    const { urls, insecure } = await getConfiguredUrls();
    expect([...urls].sort()).toEqual([
      "http://192.168.1.20/",
      "https://192.168.1.10:8006/",
      "https://proxmox.example.com/",
    ]);
    expect([...insecure]).toEqual(["https://192.168.1.10:8006/"]);
  });
});
