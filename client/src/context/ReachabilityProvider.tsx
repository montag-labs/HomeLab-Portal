import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { ReachabilityDetails } from "../types";
import { ReachabilityContext } from "./reachability-context";

const POLL_INTERVAL_MS = 30_000;

export function ReachabilityProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Record<string, ReachabilityDetails>>({});
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const check = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const snapshot = await api.getStatuses();
        if (!cancelled) {
          setResults(snapshot.results);
          setFailed(false);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoaded(true);
        }
      } finally {
        checking = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const value = useMemo(() => ({ loaded, failed, results }), [failed, loaded, results]);
  return <ReachabilityContext.Provider value={value}>{children}</ReachabilityContext.Provider>;
}
