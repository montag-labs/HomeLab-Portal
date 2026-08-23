import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConfig } from "../context/ConfigContext";
import { CategoryGroup } from "./CategoryGroup";

export function Sidebar() {
  const { config } = useConfig();
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="sidebar-title">{t("app.title")}</div>
      <nav className="sidebar-categories">
        {config &&
          [...config.categories]
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <CategoryGroup key={category.id} category={category} />
            ))}
      </nav>
      <Link to="/admin" className="sidebar-admin-link">
        {t("nav.admin")}
      </Link>
    </aside>
  );
}
