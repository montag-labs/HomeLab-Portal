import { useEffect, useState } from "react";
import { api } from "../api";

export type ReachabilityStatus = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 30_000;

export function useReachability(url: string | undefined): ReachabilityStatus {
  const [status, setStatus] = useState<ReachabilityStatus>("checking");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const check = async () => {
      try {
        const result = await api.getStatus(url);
        if (!cancelled) setStatus(result.online ? "online" : "offline");
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
  }, [url]);

  return status;
}
