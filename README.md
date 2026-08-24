# HomeLab-Portal

<a href="https://ko-fi.com/E6F725OFMG" target="_blank" rel="noopener noreferrer"><img src="https://storage.ko-fi.com/cdn/kofi3.png?v=3" alt="Support my Project on Ko-fi" width="20%"></a>

<a href="https://www.paypal.com/donate/?hosted_button_id=AAWND2KK9V22G" target="_blank" rel="noopener noreferrer"><img src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" alt="Donate with PayPal button"></a>

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

Das Portal ist anschließend standardmäßig unter http://localhost:80 erreichbar.

## Docker Compose

```bash
docker compose pull
docker compose up -d
```

Das öffentliche Image liegt unter `montaglabs/homelab-portal`. Die Anwendung ist unter http://localhost:4000 erreichbar. Die Konfiguration wird aus `server/data` in den Container gemountet und bleibt bei einem Container-Update erhalten. Für einen lokalen Build kann weiterhin `docker compose up -d --build` verwendet werden.

Der Container läuft im Betriebsmodus `docker` und in `production`. Updates werden sicher auf dem Docker-Host ausgeführt:

```bash
bash scripts/update-docker.sh
```

Das Script aktualisiert das Repository auf dem festen Branch `main`, zieht das Image `montaglabs/homelab-portal:latest` und erstellt den Container neu. Ein Docker-Socket wird nicht in den Container eingebunden.

Das Image wird durch GitHub Actions bei jedem Release-Tag automatisch gebaut und zu Docker Hub veröffentlicht. Dafür müssen im GitHub-Repository die Secrets `DOCKERHUB_USERNAME` und `DOCKERHUB_TOKEN` hinterlegt sein.

```bash
docker compose logs -f homelab-portal
docker compose down
```

## LXC-Betrieb

Die vollständige Anleitung für einen Proxmox-LXC, inklusive `systemd`-Service, Backup und Updatevorbereitung, steht in [lxc.md](lxc.md).

Für eine neue Installation im LXC kann das Installationsscript direkt aus dem Repository gestartet werden:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"
```

Der Standardport im LXC ist `80`. Ein anderer Port kann über `HOMELAB_PORT` gesetzt werden, zum Beispiel `HOMELAB_PORT=8080 bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"`.

Der gleiche Aufruf prüft bei einer bestehenden Installation auf eine neue Version und führt das Update mit Backup, Build, Healthcheck und Rollback aus.

Die Laufzeitparameter liegen nach der ersten Installation in `/etc/homelab-portal/lxc.config`. Auskommentierte Zeilen (`#`) verwenden die Defaults; nur aktive `KEY=value`-Zeilen werden beim nächsten Service-Start angewendet. Nach Änderungen genügt `systemctl restart homelab-portal`. Die Vorlage liegt in [scripts/lxc.config.example](scripts/lxc.config.example). Ein eigener Pfad kann mit `HOMELAB_CONFIG=/pfad/datei.conf` verwendet werden.

Der Parameter `APP_ENV` ist standardmäßig `production`. Für eine Entwicklungsinstallation die Zeile `APP_ENV=development` in der Parameterdatei aktivieren; dann wird im Adminbereich zusätzlich das Modul „DEV-Diagnose“ angezeigt.

Bei der Neuinstallation ist Port `80` im Dialog vorausgefüllt. Mit Enter wird der Standard übernommen. Bei einer bestehenden Installation übernimmt das Script automatisch den bisher verwendeten Port.

Nach erfolgreichem Start gibt das Script die erkannte LXC-IP und die vollständige Portal-Adresse aus.

Port einer bestehenden LXC-Installation ändern:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)" -- --switch 8080
```

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

## Updates

Im Administrationsbereich prüft das Modul „Updates“ die installierte Version gegen das neueste stabile GitHub-Release. Die Prüfung verwendet einen kurzen Cache und blockiert den Portalbetrieb nicht, wenn GitHub nicht erreichbar ist.

Für den LXC-Betrieb kann der Modus mit `UPDATE_MODE=lxc` gesetzt werden. Die Versionsprüfung ist dann verfügbar; der eigentliche Update-Script-Aufruf wird erst nach Einrichtung der beschriebenen Authentifizierung und `sudoers`-Freigabe aktiviert.

Für den UI-Updatebutton erzeugt das Script bei der LXC-Installation automatisch ein Update-Token. Das Token wird beim ersten Öffnen einmalig im Popup angezeigt, muss sicher gespeichert und anschließend im Adminbereich eingegeben werden.

Ein neues Token kann im LXC-Terminal mit `sudo /usr/local/sbin/homelab-portal-reset-token` erzeugt werden. Beim nächsten Öffnen des Portals wird es einmalig angezeigt.

Bei Docker wird `UPDATE_MODE=docker` verwendet. Das Portal zeigt die verfügbare Version und den GitHub-Release-Link an. Das eigentliche Update wird sicher hostseitig mit `docker compose pull` und `docker compose up -d` ausgeführt. Der Docker-Socket wird nicht in den Container eingebunden.

## Entwicklung

```bash
npm run dev
npm run build
npm run lint --prefix client
```

In der Entwicklungsumgebung ist die Debug-API unter `GET /api/dev/debug` verfügbar. Sie liefert Laufzeitinformationen, die geladene Konfiguration, den Update-Status und detaillierte Erreichbarkeitstests für konfigurierte URLs. Tokens, Passwörter und andere Schlüssel werden herausgefiltert. Bei `NODE_ENV=production` wird die Debug-API nicht registriert.

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
