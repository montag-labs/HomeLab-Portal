import { describe, expect, test } from "vitest";
import { appInputSchema, portalConfigSchema } from "../src/schemas.js";
import { migrateStoredAddresses, normalizeConfig } from "../src/services/configStore.js";

describe("app address validation", () => {
  const unsafe = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "192.168.1.10:8080",
  ];

  test.each(unsafe)("rejects %s as domain and local address", (value) => {
    expect(appInputSchema.safeParse({ name: "App", domain: value }).success).toBe(false);
    expect(appInputSchema.safeParse({ name: "App", localIp: value }).success).toBe(false);
  });

  test("accepts http and https addresses and empty values", () => {
    const parsed = appInputSchema.parse({ name: "App", domain: "https://app.example.test", localIp: "http://192.0.2.10:8096" });
    expect(parsed).toMatchObject({ domain: "https://app.example.test", localIp: "http://192.0.2.10:8096" });
    expect(appInputSchema.parse({ name: "App", domain: "", localIp: "" })).not.toHaveProperty("domain", "");
  });

  test("migrates stored addresses instead of failing the whole configuration", () => {
    const raw = {
      settings: { language: "de", theme: "light", accentColor: "#123456" },
      categories: [{
        id: "c", name: "C", order: 0, collapsed: false,
        apps: [{ id: "a", name: "A", order: 0, domain: "javascript:alert(1)", localIp: "192.168.1.10:8080" }],
      }],
    };

    const parsed = portalConfigSchema.parse(migrateStoredAddresses(raw));

    expect(parsed.categories[0].apps[0].domain).toBeUndefined();
    expect(parsed.categories[0].apps[0].localIp).toBe("http://192.168.1.10:8080");
  });
});

describe("configuration validation and migration", () => {
  test("rejects invalid accent colors", () => {
    const parsed = portalConfigSchema.safeParse({
      settings: { language: "de", theme: "light", accentColor: "blue" },
      categories: [],
    });

    expect(parsed.success).toBe(false);
  });

  test("migrates legacy Grafana settings to the dashboard", () => {
    const config = {
      settings: {
        language: "de" as const,
        theme: "dark" as const,
        accentColor: "#123456",
        grafana: {
          enabled: true,
          url: "https://grafana.example.test",
          dashboardUid: "home",
          dashboardSlug: "overview",
          timeRange: "now-1h" as const,
          refreshInterval: "" as const,
        },
      },
      categories: [],
    };

    const normalized = normalizeConfig(config);

    expect(normalized.settings.dashboard).toMatchObject({ provider: "grafana", title: "Grafana" });
    expect(normalized.settings.grafana).toBeUndefined();
    expect(normalized.settings.logPolicy).toEqual({ rotation: "day", archiveCount: 7 });
  });
});