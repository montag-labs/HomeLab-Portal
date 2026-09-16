import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { AppEntry } from "../types";
import { CategoryManager } from "../pages/admin/CategoryManager";

const { refresh, apps } = vi.hoisted(() => ({ refresh: vi.fn().mockResolvedValue(undefined), apps: [] as AppEntry[] }));
vi.mock("../hooks/useConfig", () => ({
  useConfig: () => ({
    refresh,
    config: { categories: [{ id: "services", name: "Services", order: 0, collapsed: false, apps }] },
  }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

afterEach(() => {
  cleanup();
  apps.length = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test.each([
  [" example.test ", "https://example.test"],
  ["https://example.test/path", "https://example.test/path"],
  ["http://192.168.1.20:8080", "http://192.168.1.20:8080"],
  ["example.test:8443/path", "https://example.test:8443/path"],
  ["", ""],
])("creates an app with domain %s", async (domain, expected) => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "new-app" }), { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  render(<CategoryManager />);
  fireEvent.change(screen.getByLabelText("admin.appName"), { target: { value: " Example " } });
  fireEvent.change(screen.getByLabelText("admin.domain"), { target: { value: domain } });
  fireEvent.click(screen.getByRole("button", { name: "admin.addApp" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0][0]).toBe("/api/categories/services/apps");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ name: "Example", domain: expected });
  expect(screen.getByLabelText("admin.appName")).toHaveValue("");
});

test("shows API validation errors and preserves inputs for retry", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    error: { fieldErrors: { domain: ["Invalid URL"] } },
  }), { status: 400 })));
  render(<CategoryManager />);
  fireEvent.change(screen.getByLabelText("admin.appName"), { target: { value: "Example" } });
  fireEvent.click(screen.getByRole("button", { name: "admin.addApp" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("domain: Invalid URL");
  expect(screen.getByLabelText("admin.appName")).toHaveValue("Example");
  expect(screen.getByRole("button", { name: "admin.addApp" })).toBeEnabled();
  expect(refresh).not.toHaveBeenCalled();
});

test("explains a missing name without sending a request", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<CategoryManager />);
  fireEvent.click(screen.getByRole("button", { name: "admin.addApp" }));
  expect(screen.getByRole("alert")).toHaveTextContent("admin.appNameRequired");
  expect(fetch).not.toHaveBeenCalled();
});


test.each([
  ["admin.domain", "http://", "example.test:8080/path", "domain"],
  ["admin.localIp", "https://", "192.168.1.10:8443/path", "localIp"],
  ["admin.localIp", "http://", "[::1]:8080", "localIp"],
])("saves the selected protocol for %s", async (label, protocol, address, field) => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "new" }), { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  render(<CategoryManager />);
  fireEvent.change(screen.getByLabelText("admin.appName"), { target: { value: "Example" } });
  fireEvent.change(screen.getByRole("combobox", { name: label + " admin.addressProtocol" }), { target: { value: protocol } });
  fireEvent.change(screen.getByLabelText(label), { target: { value: address } });
  expect(screen.getByLabelText(label)).toHaveValue(address);
  fireEvent.click(screen.getByRole("button", { name: "admin.addApp" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(JSON.parse(fetch.mock.calls[0][1].body)[field]).toBe(protocol + address);
});

test.each(["http://", "https://"])("recognizes pasted local URLs with %s", (protocol) => {
  render(<CategoryManager />);
  fireEvent.change(screen.getByLabelText("admin.localIp"), { target: { value: protocol + "192.168.1.10:8080/path" } });
  expect(screen.getByLabelText("admin.localIp")).toHaveValue("192.168.1.10:8080/path");
  expect(screen.getByRole("combobox", { name: "admin.localIp admin.addressProtocol" })).toHaveValue(protocol);
});

test("edits existing addresses and preserves paths and ports", async () => {
  apps.push({ id: "existing", name: "Example", domain: "http://example.test/path", localIp: "https://192.168.1.10:8443", order: 0 });
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "existing" }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  render(<CategoryManager />);
  fireEvent.click(screen.getByRole("button", { name: "✎" }));
  expect(screen.getAllByLabelText("admin.domain")[0]).toHaveValue("example.test/path");
  expect(screen.getAllByRole("combobox", { name: "admin.domain admin.addressProtocol" })[0]).toHaveValue("http://");
  fireEvent.change(screen.getAllByRole("combobox", { name: "admin.domain admin.addressProtocol" })[0], { target: { value: "https://" } });
  fireEvent.click(screen.getByRole("button", { name: "admin.save" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ domain: "https://example.test/path", localIp: "https://192.168.1.10:8443" });
});
