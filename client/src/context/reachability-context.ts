import { createContext } from "react";
import type { ReachabilityDetails } from "../types";

export interface ReachabilityContextValue {
  loaded: boolean;
  failed: boolean;
  results: Record<string, ReachabilityDetails>;
}

export const ReachabilityContext = createContext<ReachabilityContextValue | null>(null);
