import { z } from "zod";

export const appEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().url().optional().or(z.literal("")).transform((v) => v || undefined),
  localIp: z.string().min(1).optional().or(z.literal("")).transform((v) => v || undefined),
  iconUrl: z.string().url().optional().or(z.literal("")).transform((v) => v || undefined),
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
