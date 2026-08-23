import type { AppEntry, Category, PortalConfig, Settings } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
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
    request<{ online: boolean }>(`/api/status?url=${encodeURIComponent(url)}`),
  updateSettings: (settings: Settings) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
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
