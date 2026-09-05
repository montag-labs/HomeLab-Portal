import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { ReachabilityDetails } from "../types";
import { ReachabilityContext } from "./reachability-context";

const POLL_INTERVAL_MS = 30_000;
const STATUS_CACHE_KEY = "homelab-portal-reachability";

function readCachedResults(): Record<string, ReachabilityDetails> {
  try {
    const cached = sessionStorage.getItem(STATUS_CACHE_KEY);
    if (!cached) return {};
    const parsed: unknown = JSON.parse(cached);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, ReachabilityDetails>;
  } catch {
    return {};
  }
}

function storeResults(results: Record<string, ReachabilityDetails>): void {
  try {
    sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(results));
  } catch {
    // Status checks continue to work when browser storage is unavailable.
  }
}

export function ReachabilityProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Record<string, ReachabilityDetails>>(readCachedResults);
  const [loaded, setLoaded] = useState(() => Object.keys(readCachedResults()).length > 0);
  const [failed, setFailed] = useState(false);
  const resultsRef = useRef(results);

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const check = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const snapshot = await api.getStatuses();
        if (!cancelled) {
          resultsRef.current = snapshot.results;
          setResults(snapshot.results);
          storeResults(snapshot.results);
          setFailed(false);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setFailed(Object.keys(resultsRef.current).length === 0);
          setLoaded((current) => current || Object.keys(resultsRef.current).length > 0);
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
