import { Router } from "express";
import { access } from "node:fs/promises";
import { archiveLog, emptyLog, getArchivePath, getDownloadPath, getLogPolicy, listLogs, readLog, updateLogPolicy, } from "../services/logService.js";
import { logPolicySchema } from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";
export const logsRouter = Router();
logsRouter.use(["/logs", "/log-policy"], requireAdmin);
function handleError(res, error) {
    const message = error instanceof Error ? error.message : "Log operation failed";
    if (message === "Unknown log")
        return res.status(404).json({ error: "Log not found" });
    if (message === "Invalid archive")
        return res.status(400).json({ error: "Invalid archive" });
    return res.status(500).json({ error: "Log operation failed" });
}
logsRouter.get("/log-policy", async (_req, res) => {
    try {
        res.json(await getLogPolicy());
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.put("/log-policy", async (req, res) => {
    const parsed = logPolicySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    try {
        res.json(await updateLogPolicy(parsed.data));
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.get("/logs", async (_req, res) => {
    try {
        res.json(await listLogs());
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.get("/logs/:id/download", async (req, res) => {
    try {
        const filePath = getDownloadPath(req.params.id);
        await access(filePath);
        res.download(filePath, `${req.params.id}.log`);
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.get("/logs/:id/archives/:archiveId/download", async (req, res) => {
    try {
        const filePath = getArchivePath(req.params.id, req.params.archiveId);
        await access(filePath);
        res.download(filePath, req.params.archiveId);
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.get("/logs/:id", async (req, res) => {
    try {
        res.json(await readLog(req.params.id));
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.post("/logs/:id/archive", async (req, res) => {
    try {
        res.json(await archiveLog(req.params.id));
    }
    catch (error) {
        handleError(res, error);
    }
});
logsRouter.post("/logs/:id/empty", async (req, res) => {
    try {
        res.json(await emptyLog(req.params.id));
    }
    catch (error) {
        handleError(res, error);
    }
});
