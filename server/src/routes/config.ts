import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readConfig, writeConfig } from "../services/configStore.js";
import {
  settingsSchema,
  categoryInputSchema,
  appInputSchema,
  moveAppSchema,
  portalConfigSchema,
} from "../schemas.js";

export const configRouter = Router();

configRouter.get("/config", async (_req, res) => {
  const config = await readConfig();
  res.json(config);
});

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
  const config = await readConfig();
  config.settings = parsed.data;
  await writeConfig(config);
  res.json(config.settings);
});

configRouter.post("/categories", async (req, res) => {
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const config = await readConfig();
  const nextOrder = config.categories.length;
  config.categories.push({
    id: randomUUID(),
    name: parsed.data.name,
    order: parsed.data.order ?? nextOrder,
    collapsed: parsed.data.collapsed ?? false,
    apps: [],
  });
  await writeConfig(config);
  res.status(201).json(config.categories.at(-1));
});

configRouter.put("/categories/:id", async (req, res) => {
  const parsed = categoryInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const config = await readConfig();
  const category = config.categories.find((c) => c.id === req.params.id);
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  Object.assign(category, parsed.data);
  await writeConfig(config);
  res.json(category);
});

configRouter.delete("/categories/:id", async (req, res) => {
  const config = await readConfig();
  const index = config.categories.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Category not found" });
  }
  config.categories.splice(index, 1);
  await writeConfig(config);
  res.status(204).send();
});

configRouter.post("/categories/:id/apps", async (req, res) => {
  const parsed = appInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const config = await readConfig();
  const category = config.categories.find((c) => c.id === req.params.id);
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  const nextOrder = category.apps.length;
  const app = {
    id: randomUUID(),
    name: parsed.data.name,
    domain: parsed.data.domain,
    localIp: parsed.data.localIp,
    iconUrl: parsed.data.iconUrl,
    order: parsed.data.order ?? nextOrder,
  };
  category.apps.push(app);
  await writeConfig(config);
  res.status(201).json(app);
});

configRouter.put("/categories/:id/apps/:appId", async (req, res) => {
  const parsed = appInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const config = await readConfig();
  const category = config.categories.find((c) => c.id === req.params.id);
  const app = category?.apps.find((a) => a.id === req.params.appId);
  if (!category || !app) {
    return res.status(404).json({ error: "App not found" });
  }
  Object.assign(app, parsed.data);
  await writeConfig(config);
  res.json(app);
});

configRouter.delete("/categories/:id/apps/:appId", async (req, res) => {
  const config = await readConfig();
  const category = config.categories.find((c) => c.id === req.params.id);
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  const index = category.apps.findIndex((a) => a.id === req.params.appId);
  if (index === -1) {
    return res.status(404).json({ error: "App not found" });
  }
  category.apps.splice(index, 1);
  await writeConfig(config);
  res.status(204).send();
});

configRouter.put("/categories/:id/apps/:appId/move", async (req, res) => {
  const parsed = moveAppSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const config = await readConfig();
  const sourceCategory = config.categories.find((c) => c.id === req.params.id);
  const targetCategory = config.categories.find(
    (c) => c.id === parsed.data.targetCategoryId
  );
  if (!sourceCategory || !targetCategory) {
    return res.status(404).json({ error: "Category not found" });
  }
  const appIndex = sourceCategory.apps.findIndex((a) => a.id === req.params.appId);
  if (appIndex === -1) {
    return res.status(404).json({ error: "App not found" });
  }
  if (sourceCategory.id === targetCategory.id) {
    return res.json(sourceCategory.apps[appIndex]);
  }
  const [app] = sourceCategory.apps.splice(appIndex, 1);
  app.order = targetCategory.apps.length;
  targetCategory.apps.push(app);
  await writeConfig(config);
  res.json(app);
});
