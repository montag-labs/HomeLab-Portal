# HomeLab-Portal

Ein leichtgewichtiges Webportal fuer Homelab-Dienste mit Kategorien, Erreichbarkeitsstatus und eingebettetem Grafana-Dashboard.

## Funktionen

- Verwaltung von Kategorien und Apps
- Externe und lokale URLs pro App
- Erreichbarkeitsanzeige fuer konfigurierte Dienste
- Helles und dunkles Theme
- Deutsch und Englisch
- Import und Export der Portal-Konfiguration
- Optionales Grafana-Dashboard per Iframe
- Betrieb direkt mit Node.js oder per Docker Compose

## Voraussetzungen

- Node.js LTS
- npm
- Fuer den Containerbetrieb: Docker und Docker Compose
- Fuer den LXC-Betrieb: Debian 12 oder Ubuntu 24.04

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

Das Portal ist anschliessend standardmaessig unter http://localhost:4000 erreichbar.

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

Die vollstaendige Anleitung fuer einen Proxmox-LXC, inklusive `systemd`-Service, Backup und Updatevorbereitung, steht in [lxc.md](lxc.md).

## Grafana konfigurieren

1. In der Administration den Bereich fuer Grafana oeffnen.
2. Grafana aktivieren.
3. Die Basis-URL oder Dashboard-URL eintragen.
4. Optional Dashboard-UID und Slug, Zeitraum sowie Refresh-Intervall eintragen.
5. Einstellungen speichern.

Das Portal speichert keine Grafana-Zugangsdaten. Die Anmeldung erfolgt in Grafana. Grafana muss das Einbetten erlauben, zum Beispiel ueber `allow_embedding = true`. Abhaengig von Browser und Reverse Proxy koennen Drittanbieter-Cookies den Login im Iframe verhindern. In diesem Fall das Dashboard ueber den Link in einem neuen Tab oeffnen.

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

Die aktuelle Anwendung besitzt keine eigene Authentifizierung. Sie ist fuer den Betrieb im vertrauenswuerdigen Heimnetz vorgesehen. Port 4000 nicht ungeschuetzt aus dem Internet veroeffentlichen. Vor einer WebUI-Updatefunktion muessen insbesondere Admin-Authentifizierung, feste Updatequellen, Locking, Backups und ein Healthcheck umgesetzt werden.

Sicherheitsprobleme bitte nicht oeffentlich als Issue melden. Hinweise stehen in [SECURITY.md](SECURITY.md).

## Beitragen

Fehlerberichte und Verbesserungsvorschlaege sind willkommen. Bitte zuerst die [Beitragsrichtlinien](CONTRIBUTING.md) lesen und fuer neue Meldungen die Issue-Vorlagen verwenden.

## Lizenz

Fuer dieses Repository ist derzeit keine Open-Source-Lizenz angegeben. Ohne Lizenz gelten die gesetzlichen Urheberrechte; eine Nutzung, Weitergabe oder Aenderung ist daher nicht automatisch erlaubt.
