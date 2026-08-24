import { useEffect, useState } from "react";
import { api } from "../api";

export type ReachabilityStatus = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 30_000;

export function useReachability(
  primaryUrl: string | undefined,
  fallbackUrl?: string,
): ReachabilityStatus {
  const [status, setStatus] = useState<ReachabilityStatus>("checking");

  useEffect(() => {
    const urls = [primaryUrl, fallbackUrl].filter(
      (url): url is string => Boolean(url),
    );
    if (urls.length === 0) return;
    let cancelled = false;

    const check = async () => {
      try {
        const results = await Promise.all(urls.map((url) => api.getStatus(url)));
        if (!cancelled) setStatus(results.some((result) => result.online) ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [primaryUrl, fallbackUrl]);

  return status;
}
