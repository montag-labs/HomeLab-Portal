import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    getAuthSession: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({
      settings: { language: "de", theme: "light", accentColor: "#123456" },
      categories: [],
    }),
    getUpdateStatus: vi.fn().mockResolvedValue(null),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

test("does not request an admin session on the public route", async () => {
  render(<App />);

  await waitFor(() => expect(api.getConfig).toHaveBeenCalledOnce());

  expect(api.getAuthSession).not.toHaveBeenCalled();
});