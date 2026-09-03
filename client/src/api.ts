import type { AppEntry, AuthSession, Category, LogContent, LogPolicy, LogSource, OidcAdminConfig, OidcAdminConfigInput, PortalConfig, ReachabilitySnapshot, Settings, UpdateStartResult, UpdateStatus } from "./types";

let csrfToken = "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
    ...(options?.method && !["GET", "HEAD"].includes(options.method)
      ? { headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken, ...options.headers } }
      : {}),
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: unknown; error?: unknown };
      if (typeof body.message === "string") message = body.message;
      else if (typeof body.error === "string") message = body.error;
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
  getAuthSession: async () => {
    const session = await request<AuthSession>("/api/auth/session");
    csrfToken = session.csrfToken ?? "";
    return session;
  },
  login: async (password: string) => {
    const session = await request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    csrfToken = session.csrfToken ?? "";
    return session;
  },
  logout: async () => {
    await request<void>("/api/auth/logout", { method: "POST" });
    csrfToken = "";
  },
  changeAdminPassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getOidcConfig: () => request<OidcAdminConfig>("/api/auth/oidc/config"),
  updateOidcConfig: (config: OidcAdminConfigInput) =>
    request<OidcAdminConfig>("/api/auth/oidc/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  getConfig: () => request<PortalConfig>("/api/config"),
  updateConfig: (config: PortalConfig) =>
    request<PortalConfig>("/api/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  getStatuses: () => request<ReachabilitySnapshot>("/api/statuses"),
  getDevAvailability: () => request<{ enabled: boolean }>("/api/dev/enabled"),
  getDevDebug: () => request<Record<string, unknown>>("/api/dev/debug"),
  updateSettings: (settings: Partial<Settings>) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  updateOrders: (orders: { categoryIds?: string[]; appOrders?: Array<{ categoryId: string; appIds: string[] }> }) =>
    request<PortalConfig>("/api/orders", {
      method: "PUT",
      body: JSON.stringify(orders),
    }),
  getLogs: () => request<LogSource[]>("/api/logs"),
  getLog: (id: string) => request<LogContent>(`/api/logs/${encodeURIComponent(id)}`),
  getLogPolicy: () => request<LogPolicy>("/api/log-policy"),
  updateLogPolicy: (policy: LogPolicy) =>
    request<LogPolicy>("/api/log-policy", {
      method: "PUT",
      body: JSON.stringify(policy),
    }),
  archiveLog: (id: string) =>
    request<LogSource[]>(`/api/logs/${encodeURIComponent(id)}/archive`, { method: "POST" }),
  emptyLog: (id: string) =>
    request<LogSource[]>(`/api/logs/${encodeURIComponent(id)}/empty`, { method: "POST" }),
  getUpdateStatus: () => request<UpdateStatus>("/api/update"),
  checkForUpdates: () =>
    request<UpdateStatus>("/api/update/check", { method: "POST" }),
  installUpdate: () =>
    request<UpdateStartResult>("/api/update/install", {
      method: "POST",
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
