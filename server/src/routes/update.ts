import { Router } from "express";
import { getUpdateStatus } from "../services/updateService.js";

export const updateRouter = Router();

updateRouter.get("/update", async (_req, res) => {
  res.json(await getUpdateStatus());
});

updateRouter.post("/update/check", async (_req, res) => {
  res.json(await getUpdateStatus(true));
});