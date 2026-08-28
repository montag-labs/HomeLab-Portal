import { useContext } from "react";
import { ConfigContext } from "../context/config-context";

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useConfig must be used within ConfigProvider");
  return context;
}
