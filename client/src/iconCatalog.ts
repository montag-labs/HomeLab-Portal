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
  { id: "docker", label: "Docker", path: "/icons/docker.svg", aliases: ["docker", "container", "containers"] },
  { id: "nginx", label: "Nginx", path: "/icons/nginx.svg", aliases: ["nginx", "proxy", "reverse-proxy", "traefik"] },
  { id: "homeassistant-alt", label: "Home Assistant (Alternative)", path: "/icons/homeassistant.svg", aliases: ["home assistant alternative", "homeassistant-alt"] },
  { id: "homeassistant", label: "Home Assistant", path: "/icons/home-assistant.svg", aliases: ["home assistant", "hass", "homeassistant"] },
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
