import type { Category } from "../types";
import { api } from "../api";
import { useConfig } from "../context/ConfigContext";
import { AppCard } from "./AppCard";

export function CategoryGroup({ category }: { category: Category }) {
  const { refresh } = useConfig();

  const toggleCollapsed = async () => {
    await api.updateCategory(category.id, { collapsed: !category.collapsed });
    await refresh();
  };

  return (
    <div className="category-group">
      <button
        type="button"
        className="category-header"
        onClick={toggleCollapsed}
        aria-expanded={!category.collapsed}
      >
        <span className={`chevron ${category.collapsed ? "collapsed" : ""}`}>▾</span>
        <span>{category.name}</span>
      </button>
      {!category.collapsed && (
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
