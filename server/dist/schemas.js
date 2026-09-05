import { z } from "zod";
export const appEntrySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    domain: z.string().url().optional().or(z.literal("")).transform((v) => v || undefined),
    localIp: z.string().min(1).optional().or(z.literal("")).transform((v) => v || undefined),
    iconUrl: z
        .string()
        .refine((value) => !value || /^https?:\/\//i.test(value) || /^data:image\//i.test(value), {
        message: "Icon URL must use http, https, or an image data URL",
    })
        .optional()
        .or(z.literal(""))
        .transform((v) => v || undefined),
    iconKey: z.string().min(1).optional().or(z.literal("")).transform((v) => v || undefined),
    order: z.number().int().nonnegative(),
});
export const categorySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    order: z.number().int().nonnegative(),
    collapsed: z.boolean(),
    apps: z.array(appEntrySchema),
});
export const settingsSchema = z.object({
    language: z.enum(["de", "en"]),
    theme: z.enum(["light", "dark"]),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    logPolicy: z
        .object({
        rotation: z.enum(["day", "week", "month", "year"]),
        archiveCount: z.number().int().min(0).max(100),
    })
        .optional(),
    dashboard: z
        .object({
        enabled: z.boolean(),
        provider: z.enum(["grafana", "netdata", "uptime-kuma", "custom"]),
        title: z.string().max(80),
        url: z.string().refine((value) => !value || /^https?:\/\//i.test(value), {
            message: "Dashboard URL must use http or https",
        }),
        dashboardUid: z.string(),
        dashboardSlug: z.string(),
        timeRange: z.enum(["now-1h", "now-6h", "now-24h", "now-7d", "now-30d"]),
        refreshInterval: z.enum(["", "5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h"]),
    })
        .optional(),
    // Retained for imports and existing installations; readConfig migrates it.
    grafana: z
        .object({
        enabled: z.boolean(),
        url: z.string().refine((value) => !value || /^https?:\/\//i.test(value), {
            message: "Grafana URL must use http or https",
        }),
        dashboardUid: z.string(),
        dashboardSlug: z.string(),
        timeRange: z.enum(["now-1h", "now-6h", "now-24h", "now-7d", "now-30d"]),
        refreshInterval: z.enum(["", "5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h"]),
    })
        .optional(),
});
export const logPolicySchema = z.object({
    rotation: z.enum(["day", "week", "month", "year"]),
    archiveCount: z.number().int().min(0).max(100),
});
export const portalConfigSchema = z.object({
    settings: settingsSchema,
    categories: z.array(categorySchema),
});
export const appInputSchema = appEntrySchema.omit({ id: true, order: true }).extend({
    order: z.number().int().nonnegative().optional(),
});
export const moveAppSchema = z.object({
    targetCategoryId: z.string().min(1),
});
export const categoryInputSchema = categorySchema
    .omit({ id: true, apps: true, order: true, collapsed: true })
    .extend({
    order: z.number().int().nonnegative().optional(),
    collapsed: z.boolean().optional(),
});
const orderedIdsSchema = z.array(z.string().min(1)).min(1).superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
        context.addIssue({ code: "custom", message: "IDs must be unique" });
    }
});
export const batchOrderSchema = z.object({
    categoryIds: orderedIdsSchema.optional(),
    appOrders: z.array(z.object({
        categoryId: z.string().min(1),
        appIds: orderedIdsSchema,
    })).optional(),
}).refine((value) => value.categoryIds || value.appOrders?.length, {
    message: "At least one order must be provided",
});
