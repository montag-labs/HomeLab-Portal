import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface BrandIdentityProps {
  details?: ReactNode;
}

export function BrandIdentity({ details }: BrandIdentityProps) {
  const { t } = useTranslation();

  return (
    <>
      <span className="brand-identity-image">
        <img src="/icons/homelab-portal.png" alt="" />
      </span>
      <span className="brand-identity-copy">
        <strong>{t("app.title")}</strong>
        {details}
      </span>
    </>
  );
}
