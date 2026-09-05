import { describe, expect, test } from "vitest";
import { portalConfigSchema } from "../src/schemas.js";
import { normalizeConfig } from "../src/services/configStore.js";

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