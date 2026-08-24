import type { AppEntry, Category, PendingUpdateToken, PortalConfig, Settings, UpdateStartResult, UpdateStatus } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the HTTP error when the response has no JSON body.
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  getConfig: () => request<PortalConfig>("/api/config"),
  updateConfig: (config: PortalConfig) =>
    request<PortalConfig>("/api/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  getStatus: (url: string) =>
    request<{ online: boolean; method?: "HEAD" | "GET"; statusCode?: number; error?: string }>(
      `/api/status?url=${encodeURIComponent(url)}`,
    ),
  getDevAvailability: () => request<{ enabled: boolean }>("/api/dev/enabled"),
  getDevDebug: () => request<Record<string, unknown>>("/api/dev/debug"),
  updateSettings: (settings: Settings) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getUpdateStatus: () => request<UpdateStatus>("/api/update"),
  checkForUpdates: () =>
    request<UpdateStatus>("/api/update/check", { method: "POST" }),
  installUpdate: (token: string) =>
    request<UpdateStartResult>("/api/update/install", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-HomeLab-Update-Token": token },
    }),
  getPendingUpdateToken: () => request<PendingUpdateToken>("/api/update/token"),
  confirmUpdateToken: (token: string) =>
    request<void>("/api/update/token/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  createCategory: (data: Partial<Category>) =>
    request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<Category>) =>
    request<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/api/categories/${id}`, { method: "DELETE" }),
  createApp: (categoryId: string, data: Partial<AppEntry>) =>
    request<AppEntry>(`/api/categories/${categoryId}/apps`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateApp: (categoryId: string, appId: string, data: Partial<AppEntry>) =>
    request<AppEntry>(`/api/categories/${categoryId}/apps/${appId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteApp: (categoryId: string, appId: string) =>
    request<void>(`/api/categories/${categoryId}/apps/${appId}`, {
      method: "DELETE",
    }),
  moveApp: (categoryId: string, appId: string, targetCategoryId: string) =>
    request<AppEntry>(`/api/categories/${categoryId}/apps/${appId}/move`, {
      method: "PUT",
      body: JSON.stringify({ targetCategoryId }),
    }),
};
