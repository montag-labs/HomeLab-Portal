import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import type { UpdateStatus } from "../types";

vi.mock("../hooks/useConfig", () => ({ useConfig: () => ({ config: null }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../components/BrandIdentity", () => ({ BrandIdentity: ({ details }: { details: React.ReactNode }) => <div>{details}</div> }));
afterEach(cleanup);

it.each(["failed", "current", "available"] as const)("hides check errors and stale status for %s", (state) => {
  const status = { state, installedVersion: "1.6.1", latestVersion: state === "failed" ? undefined : "1.6.1",
    updateAvailable: state === "available", errorCode: "UPDATE_CHECK_FAILED" } as UpdateStatus;
  render(<MemoryRouter><Sidebar updateStatus={status} /></MemoryRouter>);
  expect(screen.getByText("v1.6.1").textContent).toBe("v1.6.1");
  expect(document.querySelector(".portal-brand-status-unknown")).not.toBeNull();
});

it("shows a successfully checked current status", () => {
  const status = { state: "current", installedVersion: "1.6.1", updateAvailable: false } as UpdateStatus;
  render(<MemoryRouter><Sidebar updateStatus={status} /></MemoryRouter>);
  expect(screen.getByText(/v1.6.1/).textContent).toContain("app.versionStates.current");
});
