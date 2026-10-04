import { z } from "zod";
import type { Device } from "../deviceDashboard.js";

export const scanInputSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("network"),
    subnet: z.string().max(32),
    ports: z.array(z.number().int().min(1).max(65535)).min(1).max(8).default([80, 443]),
  }),
  z.object({ source: z.literal("fritzbox"), address: z.string().max(32) }),
]);

export type ScanInput = z.infer<typeof scanInputSchema>;

export interface ScanJob {
  id: string;
  source: string;
  state: "running" | "complete" | "cancelled" | "failed" | "unavailable";
  checked: number;
  total: number;
  devices: Device[];
  message?: string;
  startedAt: string;
}
