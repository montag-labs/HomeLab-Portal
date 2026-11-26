import type { AppEntry } from "../types";
import { getAppIconUrl } from "../iconCatalog";
import { useReachability } from "../hooks/useReachability";
import { safeWebUrl } from "../utils/url";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppCard({ app }: { app: AppEntry }) {
  const domain = safeWebUrl(app.domain);
  const localIp = safeWebUrl(app.localIp);
  const primaryUrl = domain || localIp;
  const status = useReachability(domain, localIp);
  const iconUrl = getAppIconUrl(app);

  const openPrimary = () => {
    if (primaryUrl) window.open(primaryUrl, "_blank", "noreferrer");
  };

  return (
    <div
      className="app-card"
      role="link"
      tabIndex={primaryUrl ? 0 : -1}
      aria-disabled={!primaryUrl}
      onClick={openPrimary}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openPrimary();
      }}
    >
      {primaryUrl && (
        <span className={`status-dot status-dot-${status}`} title={status} />
      )}
      <div className="app-card-icon">
        {iconUrl ? <img src={iconUrl} alt="" /> : <span>{initials(app.name)}</span>}
      </div>
      <div className="app-card-body">
        <div className="app-card-name">{app.name}</div>
        {domain && (
          <a
            className="app-card-link"
            href={domain}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {domain}
          </a>
        )}
        {localIp && (
          <a
            className="app-card-link"
            href={localIp}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {localIp}
          </a>
        )}
      </div>
    </div>
  );
}
