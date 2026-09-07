import {
  Activity,
  ChartNoAxesCombined,
  CircuitBoard,
  HeartPulse,
  PanelsTopLeft,
} from "lucide-react";
import type { DashboardProvider } from "../types";

export function ProviderIcon({
  provider,
  size = 18,
}: {
  provider?: DashboardProvider;
  size?: number;
}) {
  if (provider === "grafana") return <ChartNoAxesCombined size={size} />;
  if (provider === "netdata") return <Activity size={size} />;
  if (provider === "uptime-kuma") return <HeartPulse size={size} />;
  if (provider === "devices") return <CircuitBoard size={size} />;
  return <PanelsTopLeft size={size} />;
}
