import { useEffect, useRef, useState } from "react";
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
  const kofiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.getUpdateStatus().then(setUpdateStatus).catch(() => setUpdateStatus(null));
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    script.async = true;
    script.onload = () => {
      const widget = window as typeof window & {
        kofiwidget2?: { init: (label: string, color: string, account: string) => void; draw: () => void };
      };
      widget.kofiwidget2?.init("Support me on Ko-fi", "#72a4f2", "E6F725OFMG");
      widget.kofiwidget2?.draw();
    };
    kofiRef.current?.appendChild(script);
    return () => script.remove();
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
      <footer className="sidebar-footer">
        <div ref={kofiRef} id="kofi-widget" className="sidebar-kofi" />
        <a
          className="sidebar-author-link"
          href="https://homelab.montag.nrw"
          target="_blank"
          rel="noreferrer"
        >
          Made with <span aria-label="love">♥</span> by Marc Montag
        </a>
        <a
          className="sidebar-license-link"
          href="https://github.com/montag-labs/HomeLab-Portal/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          MIT License
        </a>
      </footer>
    </aside>
  );
}
