import type { AppEntry } from "../types";
import { getAppIconUrl } from "../iconCatalog";
import { useReachability } from "../hooks/useReachability";

function resolvePrimaryUrl(app: AppEntry): string | undefined {
  return app.domain || app.localIp;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppCard({ app }: { app: AppEntry }) {
  const primaryUrl = resolvePrimaryUrl(app);
  const status = useReachability(app.domain, app.localIp);
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
        {app.domain && (
          <a
            className="app-card-link"
            href={app.domain}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {app.domain}
          </a>
        )}
        {app.localIp && (
          <a
            className="app-card-link"
            href={app.localIp}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {app.localIp}
          </a>
        )}
      </div>
    </div>
  );
}
