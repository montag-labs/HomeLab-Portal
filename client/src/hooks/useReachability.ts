import { useContext } from "react";
import { ReachabilityContext } from "../context/reachability-context";

export type ReachabilityStatus = "checking" | "online" | "offline";

function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

export function useReachability(
  primaryUrl: string | undefined,
  fallbackUrl?: string,
): ReachabilityStatus {
  const context = useContext(ReachabilityContext);
  if (!context) return "checking";

  const urls = [primaryUrl, fallbackUrl]
    .filter((url): url is string => Boolean(url))
    .map(normalizeUrl);
  if (urls.length === 0 || !context.loaded) return "checking";
  if (context.failed) return "offline";
  return urls.some((url) => context.results[url]?.online) ? "online" : "offline";
}
