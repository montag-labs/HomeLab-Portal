# HomeLab-Portal im LXC-Container

Diese Anleitung beschreibt den Betrieb des HomeLab-Portals in einem Debian- oder Ubuntu-LXC auf Proxmox. Das Portal wird direkt mit Node.js betrieben. Docker im LXC ist fuer diesen Anwendungsfall nicht erforderlich.

## 1. LXC in Proxmox erstellen

Empfohlene Grundeinstellungen:

- Template: Debian 12 oder Ubuntu 24.04
- CPU: mindestens 1 vCPU
- Arbeitsspeicher: mindestens 512 MB, empfohlen 1 GB
- Festplatte: mindestens 4 GB, empfohlen 8 GB
- Netzwerk: statische IP oder DHCP-Reservierung
- Unprivileged Container: aktiviert
- Start at boot: aktiviert

Nach dem Erstellen die Container-Konsole oeffnen und als `root` anmelden.

## 2. Basissystem vorbereiten

```bash
apt update
apt full-upgrade -y
apt install -y ca-certificates curl git sudo
```

Node.js LTS installieren:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
node --version
npm --version
```

## 3. Anwendung installieren

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/montag-labs/HomeLab-Portal.git homelab-portal
cd /opt/homelab-portal
npm run install:all
npm run build
```

Die produktive Anwendung verwendet den Server aus `server/dist`. Der Server liefert das gebaute Frontend aus `client/dist` aus.

## 4. Konfiguration sichern

Die laufende Konfiguration liegt in:

```text
/opt/homelab-portal/server/data/config.json
```

Vor Updates immer eine Sicherung erstellen:

```bash
install -d -m 700 /var/backups/homelab-portal
cp -a /opt/homelab-portal/server/data/config.json \
  /var/backups/homelab-portal/config-$(date +%Y%m%d-%H%M%S).json
```

Die Datei `config.json` darf nicht durch einen Git-Reset ueberschrieben werden.

## 5. Systemd-Service einrichten

Service-Datei anlegen:

```bash
nano /etc/systemd/system/homelab-portal.service
```

Inhalt:

```ini
[Unit]
Description=HomeLab Portal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/homelab-portal
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Service aktivieren und starten:

```bash
systemctl daemon-reload
systemctl enable --now homelab-portal
systemctl status homelab-portal
```

Logs anzeigen:

```bash
journalctl -u homelab-portal -f
```

Das Portal ist danach standardmaessig unter `http://CONTAINER-IP:4000` erreichbar.

## 6. Reverse Proxy und HTTPS

Fuer den Zugriff im Heimnetz reicht der direkte Port 4000. Fuer einen komfortablen Hostnamen und HTTPS sollte ein Reverse Proxy wie Caddy oder Nginx vorgeschaltet werden.

Der Reverse Proxy muss an die Container-IP und den Port 4000 weiterleiten. Die Anwendung selbst besitzt aktuell keine Authentifizierung. Deshalb darf Port 4000 nicht ungeschuetzt aus dem Internet erreichbar sein.

## 7. Manuelles Update

Bis die WebUI-Updatefunktion implementiert ist, wird das Update ueber die Container-Konsole ausgefuehrt:

```bash
cd /opt/homelab-portal
systemctl stop homelab-portal
install -d -m 700 /var/backups/homelab-portal
cp -a server/data/config.json \
  /var/backups/homelab-portal/config-$(date +%Y%m%d-%H%M%S).json
git fetch origin
git checkout main
git pull --ff-only origin main
npm run install:all
npm run build
systemctl start homelab-portal
systemctl status homelab-portal
```

Nach dem Start pruefen:

```bash
curl --fail http://127.0.0.1:4000/api/config > /dev/null
```

Wenn der Build fehlschlaegt, darf der Service nicht gestartet werden. Die vorherige Version bleibt dann installiert. Bei einem Fehler nach dem Start den Service wieder stoppen, die Ursache mit `journalctl -u homelab-portal` pruefen und bei Bedarf den letzten funktionierenden Git-Stand auschecken.

## 8. Vorbereitung fuer WebUI-Updates

Die Anwendung kann sich nicht verlaesslich selbst aktualisieren, waehrend ihr eigener Node-Prozess ersetzt und neu gestartet wird. Daher sollte die WebUI spaeter ein separates Update-Script starten.

Beispiel fuer `/usr/local/sbin/homelab-portal-update`:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=/opt/homelab-portal
BACKUP_DIR=/var/backups/homelab-portal
LOCK_FILE=/run/homelab-portal-update.lock

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Update laeuft bereits" >&2; exit 1; }

install -d -m 700 "$BACKUP_DIR"
cp -a "$APP_DIR/server/data/config.json" \
  "$BACKUP_DIR/config-$(date +%Y%m%d-%H%M%S).json"

cd "$APP_DIR"
CURRENT_COMMIT=$(git rev-parse HEAD)
git fetch origin
systemctl stop homelab-portal
git checkout main
git reset --hard origin/main
npm run install:all
npm run build
systemctl start homelab-portal
curl --fail --retry 10 --retry-delay 1 http://127.0.0.1:4000/api/config > /dev/null

echo "Update erfolgreich: $(git rev-parse --short HEAD)"
```

Script schuetzen:

```bash
chmod 750 /usr/local/sbin/homelab-portal-update
chown root:root /usr/local/sbin/homelab-portal-update
```

Das Script verwendet `git reset --hard origin/main`. Es darf nur eingesetzt werden, wenn der Installationsordner keine lokalen Quellcodeaenderungen enthaelt. Die Konfiguration liegt ausserhalb der Git-Aenderungen und wird separat gesichert.

## 9. WebUI-Update sicher freigeben

Vor einem Update-Button in der WebUI muessen mindestens folgende Punkte umgesetzt werden:

1. Admin-Authentifizierung oder vorgeschaltete Reverse-Proxy-Authentifizierung.
2. Serverroute, die nur das feste Update-Script starten darf.
3. Keine frei uebergebbaren Shell-Befehle, URLs oder Branches.
4. Ein Lock gegen parallele Updates.
5. Statusanzeige fuer `running`, `success` und `failed`.
6. Backup und Healthcheck vor einer Erfolgsmeldung.
7. Begrenzte Berechtigung, idealerweise ueber einen eigenen Systembenutzer und eine enge `sudoers`-Regel.

Das Update-Script darf niemals direkt mit Daten aus einem Formular zusammengesetzt werden.

## 10. Fehlerdiagnose

```bash
systemctl status homelab-portal
journalctl -u homelab-portal -n 100 --no-pager
ss -ltnp | grep 4000
curl -i http://127.0.0.1:4000/api/config
```

Wenn der Zugriff von ausserhalb des Containers nicht funktioniert, zuerst die Container-IP, den Listener-Port, die Proxmox-Firewall und danach den Reverse Proxy pruefen.
