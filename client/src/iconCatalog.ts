import type { AppEntry } from "./types";

export interface AppIconDefinition {
  id: string;
  label: string;
  path: string;
  aliases: string[];
}

export const APP_ICONS: AppIconDefinition[] = [
  { id: "default", label: "Default", path: "/icons/default.svg", aliases: ["default", "portal", "homelab", "home", "homelab-portal"] },
  { id: "adguard-home", label: "AdGuard Home", path: "/icons/adguard-home.svg", aliases: ["adguard", "adguard home", "dns", "network"] },
  { id: "arcane", label: "Arcane", path: "/icons/arcane.svg", aliases: ["arcane", "docker", "container"] },
  { id: "cronicle", label: "Cronicle", path: "/icons/cronicle.svg", aliases: ["cronicle", "scheduler", "cron"] },
  { id: "docker", label: "Docker", path: "/icons/docker.svg", aliases: ["docker", "container", "containers"] },
  { id: "dockhand", label: "Dockhand", path: "/icons/dockhand.svg", aliases: ["dockhand", "docker management"] },
  { id: "filaman-system-app", label: "Filaman System App", path: "/icons/filaman.png", aliases: ["filaman", "filaman system app", "filaman-system-app"] },
  { id: "influxdb", label: "InfluxDB 3", path: "/icons/influxdb.svg", aliases: ["influxdb", "influxdb 3", "time series database"] },
  { id: "nginx", label: "Nginx", path: "/icons/nginx.svg", aliases: ["nginx", "proxy", "reverse-proxy", "traefik"] },
  { id: "homeassistant", label: "Home Assistant", path: "/icons/home-assistant.svg", aliases: ["home assistant", "hass", "homeassistant"] },
  { id: "jdownloader", label: "JDownloader 2", path: "/icons/jdownloader.svg", aliases: ["jdownloader", "jdownloader 2", "download manager"] },
  { id: "keycloak", label: "Keycloak", path: "/icons/keycloak.svg", aliases: ["keycloak", "identity", "iam"] },
  { id: "nextcloud", label: "Nextcloud", path: "/icons/nextcloud.svg", aliases: ["nextcloud", "cloud"] },
  { id: "grafana", label: "Grafana", path: "/icons/grafana.svg", aliases: ["grafana", "dashboards"] },
  { id: "graylog", label: "Graylog", path: "/icons/graylog.svg", aliases: ["graylog", "logs", "logging"] },
  { id: "prometheus", label: "Prometheus", path: "/icons/prometheus.svg", aliases: ["prometheus", "monitoring", "metrics"] },
  { id: "pihole", label: "Pi-hole", path: "/icons/pihole.svg", aliases: ["pihole", "adguard", "dns"] },
  { id: "portainer", label: "Portainer", path: "/icons/portainer.svg", aliases: ["portainer", "docker-ui"] },
  { id: "jellyfin", label: "Jellyfin", path: "/icons/jellyfin.svg", aliases: ["jellyfin", "media", "plex", "emby"] },
  { id: "emby", label: "Emby", path: "/icons/emby.svg", aliases: ["emby", "media"] },
  { id: "bitwarden", label: "Bitwarden", path: "/icons/bitwarden.svg", aliases: ["bitwarden", "bw", "password"] },
  { id: "vaultwarden", label: "Vaultwarden", path: "/icons/vaultwarden.svg", aliases: ["vaultwarden", "vault", "password"] },
  { id: "n8n", label: "n8n", path: "/icons/n8n.svg", aliases: ["n8n", "automation", "workflow"] },
  { id: "sonarr", label: "Sonarr", path: "/icons/sonarr.svg", aliases: ["sonarr", "series"] },
  { id: "radarr", label: "Radarr", path: "/icons/radarr.svg", aliases: ["radarr", "movies"] },
  { id: "lidarr", label: "Lidarr", path: "/icons/lidarr.svg", aliases: ["lidarr", "music"] },
  { id: "whisparr", label: "Whisparr", path: "/icons/whisparr.svg", aliases: ["whisparr", "movies"] },
  { id: "readarr", label: "Readarr", path: "/icons/readarr.svg", aliases: ["readarr", "books"] },
  { id: "prowlarr", label: "Prowlarr", path: "/icons/prowlarr.svg", aliases: ["prowlarr", "indexer"] },
  { id: "opendtu", label: "OpenDTU", path: "/icons/opendtu.png", aliases: ["opendtu", "solar", "inverter"] },
  { id: "paperless-ngx", label: "Paperless-ngx", path: "/icons/paperless-ngx.svg", aliases: ["paperless ngx", "paperless-ngx", "documents"] },
  { id: "paperless-ai", label: "Paperless AI", path: "/icons/paperless-ai.png", aliases: ["paperless ai", "paperless-ai", "documents"] },
  { id: "paperless", label: "Paperless", path: "/icons/paperless.svg", aliases: ["paperless", "documents"] },
  { id: "patchmon", label: "PatchMon", path: "/icons/patchmon.svg", aliases: ["patchmon", "patching", "updates"] },
  { id: "phpipam", label: "phpIPAM", path: "/icons/phpipam.png", aliases: ["phpipam", "ipam", "network"] },
  { id: "proxmox", label: "Proxmox", path: "/icons/proxmox.svg", aliases: ["proxmox", "virtualization", "vm", "lxc"] },
  { id: "sabnzbd", label: "SABnzbd", path: "/icons/sabnzbd.svg", aliases: ["sabnzbd", "usenet", "downloads"] },
  { id: "synology", label: "Synology", path: "/icons/synology.svg", aliases: ["synology", "nas", "storage"] },
  { id: "zoraxy", label: "Zoraxy", path: "/icons/zoraxy.svg", aliases: ["zoraxy", "proxy", "reverse-proxy"] },
];

function normalizeIconText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectAppIconKey(name: string, domain?: string, localIp?: string): string | undefined {
  const fields = [name, domain ?? "", localIp ?? ""]
    .map(normalizeIconText)
    .filter(Boolean);

  for (const field of fields) {
    const keywords = (icon: AppIconDefinition) => [...icon.aliases, icon.id];
    const exactMatch = APP_ICONS.find((icon) =>
      keywords(icon).some((keyword) => normalizeIconText(keyword) === field),
    );
    if (exactMatch) return exactMatch.id;

    const words = field.split(" ");
    const wordMatch = APP_ICONS.find((icon) =>
      keywords(icon).some((keyword) => words.includes(normalizeIconText(keyword))),
    );
    if (wordMatch) return wordMatch.id;

    const partialMatch = APP_ICONS.find((icon) =>
      keywords(icon).some((keyword) => field.includes(normalizeIconText(keyword))),
    );
    if (partialMatch) return partialMatch.id;
  }

  return undefined;
}

export function getAppIconUrl(app: Pick<AppEntry, "iconUrl" | "iconKey" | "name" | "domain" | "localIp">): string | undefined {
  if (app.iconUrl && app.iconUrl.trim()) return app.iconUrl;

  const iconKey = app.iconKey;
  if (!iconKey) return undefined;

  const match = APP_ICONS.find((icon) => icon.id === iconKey);
  return match?.path;
}
