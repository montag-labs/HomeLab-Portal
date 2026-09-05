import { describe, expect, test } from "vitest";
import { detectAppIconKey, getAppIconUrl } from "./iconCatalog";

describe("detectAppIconKey", () => {
  test.each([
    ["Adguard Home", "adguard-home"],
    ["Arcane Docker", "arcane"],
    ["Paperless-NGX", "paperless-ngx"],
    ["Paperless-AI", "paperless-ai"],
    ["Home Assistant", "homeassistant"],
  ])("detects %s as %s", (name, expected) => {
    expect(detectAppIconKey(name)).toBe(expected);
  });

  test("checks the app name before generic domain aliases", () => {
    expect(detectAppIconKey("Zoraxy", "https://proxy.example.test")).toBe("zoraxy");
  });

  test("does not detect an icon during portal rendering", () => {
    expect(getAppIconUrl({ name: "Grafana" })).toBeUndefined();
    expect(getAppIconUrl({ name: "Grafana", iconKey: "grafana" })).toBe("/icons/grafana.svg");
  });
});
