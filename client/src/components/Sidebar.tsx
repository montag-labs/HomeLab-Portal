import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useConfig } from "../context/ConfigContext";
import type { UpdateStatus } from "../types";
import { CategoryGroup } from "./CategoryGroup";
import { BrandLogo } from "./BrandLogo";

export function Sidebar() {
  const { config } = useConfig();
  const { t } = useTranslation();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    api.getUpdateStatus().then(setUpdateStatus).catch(() => setUpdateStatus(null));
  }, []);

  const versionState = updateStatus?.updateAvailable ? "available" : updateStatus?.state ?? "loading";
  const versionStatus = updateStatus
    ? t(`app.versionStates.${versionState}`)
    : t("app.versionStates.loading");

  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <BrandLogo
          version={updateStatus?.installedVersion ?? "-"}
          status={versionStatus}
          statusState={versionState}
        />
      </div>
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
