import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mutateConfig, readConfig, writeConfig } from "../services/configStore.js";
import {
  settingsSchema,
  categoryInputSchema,
  appInputSchema,
  moveAppSchema,
  portalConfigSchema,
} from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";

export const configRouter = Router();

configRouter.get("/config", async (_req, res) => {
  const config = await readConfig();
  res.json(config);
});

configRouter.use(["/config", "/settings", "/categories"], requireAdmin);

configRouter.put("/config", async (req, res) => {
  const parsed = portalConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await writeConfig(parsed.data);
  res.json(parsed.data);
});

configRouter.put("/settings", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const settings = await mutateConfig((config) => {
    config.settings = parsed.data;
    return config.settings;
  });
  res.json(settings);
});

configRouter.post("/categories", async (req, res) => {
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const category = await mutateConfig((config) => {
    const category = {
      id: randomUUID(),
      name: parsed.data.name,
      order: parsed.data.order ?? config.categories.length,
      collapsed: parsed.data.collapsed ?? false,
      apps: [],
    };
    config.categories.push(category);
    return category;
  });
  res.status(201).json(category);
});

configRouter.put("/categories/:id", async (req, res) => {
  const parsed = categoryInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const category = await mutateConfig((config) => {
    const category = config.categories.find((c) => c.id === req.params.id);
    if (!category) return undefined;
    Object.assign(category, parsed.data);
    return category;
  });
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
});

configRouter.delete("/categories/:id", async (req, res) => {
  const deleted = await mutateConfig((config) => {
    const index = config.categories.findIndex((c) => c.id === req.params.id);
    if (index === -1) return false;
    config.categories.splice(index, 1);
    return true;
  });
  if (!deleted) return res.status(404).json({ error: "Category not found" });
  res.status(204).send();
});

configRouter.post("/categories/:id/apps", async (req, res) => {
  const parsed = appInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const app = await mutateConfig((config) => {
    const category = config.categories.find((c) => c.id === req.params.id);
    if (!category) return undefined;
    const app = {
      id: randomUUID(),
      name: parsed.data.name,
      domain: parsed.data.domain,
      localIp: parsed.data.localIp,
      iconUrl: parsed.data.iconUrl,
      iconKey: parsed.data.iconKey,
      order: parsed.data.order ?? category.apps.length,
    };
    category.apps.push(app);
    return app;
  });
  if (!app) return res.status(404).json({ error: "Category not found" });
  res.status(201).json(app);
});

configRouter.put("/categories/:id/apps/:appId", async (req, res) => {
  const parsed = appInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const app = await mutateConfig((config) => {
    const category = config.categories.find((c) => c.id === req.params.id);
    const app = category?.apps.find((a) => a.id === req.params.appId);
    if (!app) return undefined;
    Object.assign(app, parsed.data);
    return app;
  });
  if (!app) return res.status(404).json({ error: "App not found" });
  res.json(app);
});

configRouter.delete("/categories/:id/apps/:appId", async (req, res) => {
  const deleted = await mutateConfig((config) => {
    const category = config.categories.find((c) => c.id === req.params.id);
    if (!category) return false;
    const index = category.apps.findIndex((a) => a.id === req.params.appId);
    if (index === -1) return false;
    category.apps.splice(index, 1);
    return true;
  });
  if (!deleted) return res.status(404).json({ error: "App not found" });
  res.status(204).send();
});

configRouter.put("/categories/:id/apps/:appId/move", async (req, res) => {
  const parsed = moveAppSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = await mutateConfig((config) => {
    const sourceCategory = config.categories.find((c) => c.id === req.params.id);
    const targetCategory = config.categories.find((c) => c.id === parsed.data.targetCategoryId);
    if (!sourceCategory || !targetCategory) return { error: "category" as const };
    const appIndex = sourceCategory.apps.findIndex((a) => a.id === req.params.appId);
    if (appIndex === -1) return { error: "app" as const };
    const app = sourceCategory.apps[appIndex];
    if (sourceCategory.id !== targetCategory.id) {
      sourceCategory.apps.splice(appIndex, 1);
      app.order = targetCategory.apps.length;
      targetCategory.apps.push(app);
    }
    return { app };
  });
  if ("error" in result) {
    return res.status(404).json({ error: result.error === "category" ? "Category not found" : "App not found" });
  }
  const { app } = result;
  res.json(app);
});
