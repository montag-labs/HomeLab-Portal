import { Router } from "express";
import { z } from "zod";
import http from "node:http";
import https from "node:https";

export const statusRouter = Router();

const querySchema = z.object({
  url: z.string().url(),
});

function isReachable(urlString: string): Promise<boolean> {
  return new Promise((resolve) => {
    let target: URL;
    try {
      target = new URL(urlString);
    } catch {
      resolve(false);
      return;
    }
    const client = target.protocol === "https:" ? https : http;
    const req = client.request(
      target,
      {
        method: "HEAD",
        timeout: 3000,
        // Homelab services often use self-signed certificates.
        rejectUnauthorized: false,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}

statusRouter.get("/status", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const online = await isReachable(parsed.data.url);
  res.json({ online });
});
