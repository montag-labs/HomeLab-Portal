import { describe, expect, test } from "vitest";
import { safeWebUrl } from "../utils/url";

describe("safeWebUrl", () => {
  test("keeps http and https addresses", () => {
    expect(safeWebUrl("https://app.example.test")).toBe("https://app.example.test");
    expect(safeWebUrl("http://192.0.2.10:8096")).toBe("http://192.0.2.10:8096");
  });

  test.each(["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,x", "vbscript:x", "not a url", "", undefined])(
    "drops %s",
    (value) => expect(safeWebUrl(value)).toBeUndefined(),
  );
});
