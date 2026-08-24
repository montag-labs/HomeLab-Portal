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
    let settled = false;

    const finish = (online: boolean) => {
      if (settled) return;
      settled = true;
      resolve(online);
    };

    const request = (method: "HEAD" | "GET") => {
      const req = client.request(
        target,
        {
          method,
          timeout: 8000,
          // Homelab services often use self-signed certificates.
          rejectUnauthorized: false,
        },
        (res) => {
          const shouldFallback = method === "HEAD" && (res.statusCode === 405 || res.statusCode === 501);
          res.resume();
          if (shouldFallback) {
            request("GET");
          } else {
            finish(true);
          }
        }
      );
      req.on("timeout", () => {
        req.destroy();
        finish(false);
      });
      req.on("error", () => finish(false));
      req.end();
    };

    request("HEAD");
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
