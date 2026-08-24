# HomeLab-Portal

Ein leichtgewichtiges Webportal für Homelab-Dienste mit Kategorien, Erreichbarkeitsstatus und eingebettetem Grafana-Dashboard.

HomeLab-Portal is a lightweight web portal for homelab services with categories, reachability status indicators, and an embedded Grafana dashboard.

## Funktionen

- Verwaltung von Kategorien und Apps
- Externe und lokale URLs pro App
- Erreichbarkeitsanzeige für konfigurierte Dienste
- Helles und dunkles Theme
- Deutsch und Englisch
- Import und Export der Portal-Konfiguration
- Optionales Grafana-Dashboard per Iframe
- Betrieb direkt mit Node.js oder per Docker Compose

## Voraussetzungen

- Node.js LTS
- npm
- Für den Containerbetrieb: Docker und Docker Compose
- Für den LXC-Betrieb: Debian 12 oder Ubuntu 24.04

## Schnellstart mit Node.js

```bash
git clone https://github.com/montag-labs/HomeLab-Portal.git
cd HomeLab-Portal
npm run install:all
npm run dev
```

Danach:

- Portal: http://localhost:5173
- API: http://localhost:4000

Der Vite-Entwicklungsserver leitet `/api` an den Server auf Port 4000 weiter.

## Produktivbetrieb

```bash
npm run install:all
npm run build
npm start
```

Das Portal ist anschließend standardmäßig unter http://localhost:4000 erreichbar.

## Docker Compose

```bash
docker compose up -d --build
```

Die Anwendung ist unter http://localhost:4000 erreichbar. Die Konfiguration wird aus `server/data` in den Container gemountet und bleibt bei einem Container-Update erhalten.

```bash
docker compose logs -f homelab-portal
docker compose down
```

## LXC-Betrieb

Die vollständige Anleitung für einen Proxmox-LXC, inklusive `systemd`-Service, Backup und Updatevorbereitung, steht in [lxc.md](lxc.md).

## Grafana konfigurieren

1. In der Administration den Bereich für Grafana öffnen.
2. Grafana aktivieren.
3. Die Basis-URL oder Dashboard-URL eintragen.
4. Optional Dashboard-UID und Slug, Zeitraum sowie Refresh-Intervall eintragen.
5. Einstellungen speichern.

Das Portal speichert keine Grafana-Zugangsdaten. Die Anmeldung erfolgt in Grafana. Grafana muss das Einbetten erlauben, zum Beispiel über `allow_embedding = true`. Abhängig von Browser und Reverse Proxy können Drittanbieter-Cookies den Login im Iframe verhindern. In diesem Fall das Dashboard über den Link in einem neuen Tab öffnen.

## Konfiguration

Die produktive Konfiguration liegt in:

```text
server/data/config.json
```

Die Datei wird nicht versioniert. Eine Startvorlage befindet sich in [server/data/config.default.json](server/data/config.default.json). Vor manuellen Updates oder Importen sollte `config.json` gesichert werden.

## Entwicklung

```bash
npm run dev
npm run build
npm run lint --prefix client
```

Das Projekt besteht aus:

- `client/`: React, TypeScript und Vite
- `server/`: Express, TypeScript und Zod
- `server/data/`: lokale Laufzeitkonfiguration

Der Server liefert im Produktivbetrieb das gebaute Frontend aus `client/dist` aus.

## Sicherheit

Die aktuelle Anwendung besitzt keine eigene Authentifizierung. Sie ist für den Betrieb im vertrauenswürdigen Heimnetz vorgesehen. Port 4000 nicht ungeschützt aus dem Internet veröffentlichen. Vor einer WebUI-Updatefunktion müssen insbesondere Admin-Authentifizierung, feste Updatequellen, Locking, Backups und ein Healthcheck umgesetzt werden.

Sicherheitsprobleme bitte nicht öffentlich als Issue melden. Hinweise stehen in [SECURITY.md](SECURITY.md).

## Beitragen

Fehlerberichte und Verbesserungsvorschläge sind willkommen. Bitte zuerst die [Beitragsrichtlinien](CONTRIBUTING.md) lesen und für neue Meldungen die Issue-Vorlagen verwenden.

## Lizenz

Für dieses Repository ist derzeit keine Open-Source-Lizenz angegeben. Ohne Lizenz gelten die gesetzlichen Urheberrechte; eine Nutzung, Weitergabe oder Änderung ist daher nicht automatisch erlaubt.
