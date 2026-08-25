import type { AppEntry } from "./types";

export interface AppIconDefinition {
  id: string;
  label: string;
  path: string;
  aliases: string[];
}

export const APP_ICONS: AppIconDefinition[] = [
  { id: "default", label: "Default", path: "/icons/default.svg", aliases: ["default", "portal", "homelab", "home", "homelab-portal"] },
  { id: "docker", label: "Docker", path: "/icons/docker.svg", aliases: ["docker", "container", "containers"] },
  { id: "nginx", label: "Nginx", path: "/icons/nginx.svg", aliases: ["nginx", "proxy", "reverse-proxy", "traefik"] },
  { id: "homeassistant", label: "Home Assistant", path: "/icons/homeassistant.svg", aliases: ["home assistant", "hass", "homeassistant"] },
  { id: "nextcloud", label: "Nextcloud", path: "/icons/nextcloud.svg", aliases: ["nextcloud", "cloud"] },
  { id: "grafana", label: "Grafana", path: "/icons/grafana.svg", aliases: ["grafana", "dashboards"] },
  { id: "prometheus", label: "Prometheus", path: "/icons/prometheus.svg", aliases: ["prometheus", "monitoring", "metrics"] },
  { id: "pihole", label: "Pi-hole", path: "/icons/pihole.svg", aliases: ["pihole", "adguard", "dns"] },
  { id: "portainer", label: "Portainer", path: "/icons/portainer.svg", aliases: ["portainer", "docker-ui"] },
  { id: "jellyfin", label: "Jellyfin", path: "/icons/jellyfin.svg", aliases: ["jellyfin", "media", "plex", "emby"] },
  { id: "qbittorrent", label: "qBittorrent", path: "/icons/qbittorrent.svg", aliases: ["qbittorrent", "torrent", "transmission"] },
  { id: "vaultwarden", label: "Vaultwarden", path: "/icons/vaultwarden.svg", aliases: ["vaultwarden", "bitwarden", "password"] },
  { id: "uptimekuma", label: "Uptime Kuma", path: "/icons/uptimekuma.svg", aliases: ["uptime", "uptimekuma", "status"] },
  { id: "n8n", label: "n8n", path: "/icons/n8n.svg", aliases: ["n8n", "automation", "workflow"] },
  { id: "sonarr", label: "Sonarr", path: "/icons/sonarr.svg", aliases: ["sonarr", "series"] },
  { id: "radarr", label: "Radarr", path: "/icons/radarr.svg", aliases: ["radarr", "movies"] },
  { id: "prowlarr", label: "Prowlarr", path: "/icons/prowlarr.svg", aliases: ["prowlarr", "indexer"] },
  { id: "paperless", label: "Paperless", path: "/icons/paperless.svg", aliases: ["paperless", "documents"] },
];

export function detectAppIconKey(name: string, domain?: string, localIp?: string): string | undefined {
  const haystacks = [
    name,
    domain ?? "",
    localIp ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const icon of APP_ICONS) {
    const keywords = [...icon.aliases, icon.id];
    if (keywords.some((keyword) => haystacks.includes(keyword.toLowerCase()))) {
      return icon.id;
    }
  }

  return undefined;
}

export function getAppIconUrl(app: Pick<AppEntry, "iconUrl" | "iconKey" | "name" | "domain" | "localIp">): string | undefined {
  if (app.iconUrl && app.iconUrl.trim()) return app.iconUrl;

  const iconKey = app.iconKey ?? detectAppIconKey(app.name, app.domain, app.localIp);
  if (!iconKey) return undefined;

  const match = APP_ICONS.find((icon) => icon.id === iconKey);
  return match?.path;
}
