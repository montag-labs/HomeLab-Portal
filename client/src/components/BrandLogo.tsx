import { useTranslation } from "react-i18next";

interface BrandLogoProps {
  version: string;
  status: string;
  statusState: string;
}

export function BrandLogo({ version, status, statusState }: BrandLogoProps) {
  const { t } = useTranslation();

  return (
    <svg
      className="brand-logo"
      viewBox="0 0 320 100"
      role="img"
      aria-labelledby="brand-logo-title"
    >
      <title id="brand-logo-title">{t("app.title")}</title>
      <rect className="brand-logo-mark" x="4" y="4" width="72" height="72" rx="18" />
      <rect className="brand-logo-server" x="15" y="17" width="50" height="46" rx="7" />
      <path className="brand-logo-prompt" d="m25 31 8 7-8 7M38 47h13" />
      <path className="brand-logo-status-line" d="M20 55h40" />
      <circle className="brand-logo-status brand-logo-status-red" cx="35" cy="25" r="3" />
      <circle className="brand-logo-status brand-logo-status-yellow" cx="44" cy="25" r="3" />
      <circle className="brand-logo-status brand-logo-status-green" cx="53" cy="25" r="3" />
      <text className="brand-logo-name" x="90" y="33">
        HomeLab<tspan className="brand-logo-accent">-Portal</tspan>
      </text>
      <a
        className="brand-logo-author"
        href="https://github.com/montag-labs/HomeLab-Portal"
        target="_blank"
        rel="noreferrer"
      >
        <text x="90" y="53">by Marc Montag</text>
      </a>
      <circle className={`brand-logo-version-indicator brand-logo-version-${statusState}`} cx="94" cy="73" r="4" />
      <text className="brand-logo-version" x="104" y="77">
        {version} · {status}
      </text>
    </svg>
  );
}
