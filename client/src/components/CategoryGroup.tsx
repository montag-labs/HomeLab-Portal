import type { Category } from "../types";
import { useState } from "react";
import { api } from "../api";
import { useConfig } from "../context/ConfigContext";
import { AppCard } from "./AppCard";

export function CategoryGroup({ category }: { category: Category }) {
  const { refresh } = useConfig();
  const [collapsed, setCollapsed] = useState(category.collapsed);
  const [saving, setSaving] = useState(false);

  const toggleCollapsed = async () => {
    if (saving) return;
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    setSaving(true);
    try {
      await api.updateCategory(category.id, { collapsed: nextCollapsed });
      await refresh();
    } catch {
      setCollapsed(collapsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="category-group">
      <button
        type="button"
        className="category-header"
        onClick={toggleCollapsed}
        disabled={saving}
        aria-expanded={!collapsed}
        aria-busy={saving}
      >
        <span className={`chevron ${collapsed ? "collapsed" : ""}`}>▾</span>
        <span>{category.name}</span>
      </button>
      {!collapsed && (
        <div className="category-apps">
          {[...category.apps]
            .sort((a, b) => a.order - b.order)
            .map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
        </div>
      )}
    </div>
  );
}
