import type { Category } from "../types";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppCard } from "./AppCard";

export function CategoryGroup({ category }: { category: Category }) {
  const storageKey = `homelab-category-collapsed:${category.id}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === null ? category.collapsed : stored === "true";
    } catch {
      return category.collapsed;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // The category remains interactive when browser storage is unavailable.
      }
      return next;
    });
  };

  return (
    <div className="category-group">
      <button
        type="button"
        className="category-header"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
      >
        <ChevronDown className={`chevron ${collapsed ? "collapsed" : ""}`} size={16} aria-hidden="true" />
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
