import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Heart, Scale, Settings2 } from "lucide-react";
import { useConfig } from "../hooks/useConfig";
import { CategoryGroup } from "./CategoryGroup";

export function Sidebar() {
  const { config } = useConfig();
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <nav className="sidebar-categories">
        {config &&
          [...config.categories]
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <CategoryGroup key={category.id} category={category} />
            ))}
      </nav>
      <Link to="/admin" className="sidebar-admin-link">
        <Settings2 size={17} aria-hidden="true" />
        <span>{t("nav.admin")}</span>
        <ArrowRight className="sidebar-admin-arrow" size={16} aria-hidden="true" />
      </Link>
      <footer className="sidebar-footer">
        <div className="sidebar-support-links">
          <a
            className="sidebar-support-link"
            href="https://ko-fi.com/E6F725OFMG"
            target="_blank"
            rel="noreferrer"
          >
            <Heart size={14} aria-hidden="true" />
            Ko-fi
          </a>
          <a
            className="sidebar-support-link"
            href="https://www.paypal.com/donate/?hosted_button_id=AAWND2KK9V22G"
            target="_blank"
            rel="noreferrer"
          >
            <Heart size={14} aria-hidden="true" />
            PayPal
          </a>
        </div>
        <a
          className="sidebar-author-link"
          href="https://github.com/montag-labs/HomeLab-Portal"
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
          <Scale size={13} aria-hidden="true" />
          MIT License
        </a>
      </footer>
    </aside>
  );
}
