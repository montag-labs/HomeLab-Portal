# HomeLab-Portal im LXC-Container

Diese Anleitung beschreibt den Betrieb des HomeLab-Portals in einem Debian- oder Ubuntu-LXC auf Proxmox. Das Portal wird direkt mit Node.js betrieben. Docker im LXC ist für diesen Anwendungsfall nicht erforderlich.

## 1. LXC in Proxmox erstellen

Empfohlene Grundeinstellungen:

- Template: Debian 13 oder Ubuntu 24.04
- CPU: mindestens 1 vCPU
- Arbeitsspeicher: mindestens 512 MB, empfohlen 1 GB
- Festplatte: mindestens 4 GB, empfohlen 8 GB
- Netzwerk: statische IP oder DHCP-Reservierung
- Unprivileged Container: aktiviert

Nach dem Erstellen die Container-Konsole öffnen und als `root` anmelden.

## Schnellinstallation

Die Installation kann direkt aus diesem Repository gestartet werden:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"
```

Das Script installiert die benötigten Systempakete, Node.js 26, die Anwendung unter `/opt/homelab-portal` und den systemd-Service. Anschließend wartet es bis zu 30 Sekunden auf den Healthcheck und zeigt die erkannte LXC-IP mit Port an. Wird derselbe Aufruf später erneut gestartet, prüft das Script die installierte Version und aktualisiert nur bei einem neuen Stand. Vor dem Update wird die Konfiguration gesichert; bei einem Build- oder Healthcheck-Fehler wird ein Rollback versucht.

Bei einer Neuinstallation fragt das Script nach dem Portal-Port. Der Standardwert `80` ist bereits eingetragen; mit Enter wird er übernommen. Bei einer bestehenden Installation wird der bisher verwendete Port automatisch beibehalten. Ein Port kann jederzeit über `HOMELAB_PORT` vorgegeben werden.

Die laufende Installation wird über `/etc/homelab-portal/lxc.config` konfiguriert. Auskommentierte Zeilen mit `#` verwenden den Default. Nur aktive und ausgefüllte `KEY=value`-Zeilen werden angewendet. Eine Vorlage befindet sich unter [scripts/lxc.config.example](scripts/lxc.config.example). Nach einer Änderung muss nur `systemctl restart homelab-portal` ausgeführt werden; das Installationsscript ist dafür nicht erforderlich. Ein alternativer Pfad kann über `HOMELAB_CONFIG=/pfad/datei.conf` gesetzt werden.

`APP_ENV=production` ist der Standard. Für DEV die Zeile `APP_ENV=development` aktivieren. Dann wird die DEV-API registriert und im Adminbereich der Tab „DEV-Diagnose“ eingeblendet. Auf einer öffentlich erreichbaren Instanz darf DEV nicht aktiviert werden.

Für den Updatebutton in der WebUI erzeugt das Script automatisch ein Update-Token. Beim ersten Öffnen des Portals wird es einmalig in einem Popup angezeigt. Das Token wird nicht in der Anwendung gespeichert, sondern als geschützte Datei unter `/var/lib/homelab-portal/update-token` verwaltet.

Den Port einer bestehenden Installation kann man ohne Update mit `--switch` ändern:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)" -- --switch 8080
```

Das Script aktualisiert dabei nur die systemd-Service-Datei, startet den Service neu und prüft den neuen Port.

Nach der Installation kann das Token im Adminbereich unter „Updates“ eingegeben werden. Bei einem verfügbaren Update startet der Button das fest installierte `/usr/local/sbin/homelab-portal-update`-Script. Der Serverprozess wird dabei neu gestartet; die Oberfläche lädt sich anschließend automatisch neu.

Token neu setzen:

```bash
sudo /usr/local/sbin/homelab-portal-reset-token
```

Das alte Token wird ungültig. Beim nächsten Öffnen des Portals erscheint das neue Token einmalig im Popup.

## 2. Basissystem vorbereiten

```bash
apt update
apt full-upgrade -y
apt install -y ca-certificates curl git sudo
```

Node.js 26 installieren:

```bash
curl -fsSL https://deb.nodesource.com/setup_26.x | bash -
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

Die Datei `config.json` darf nicht durch einen Git-Reset überschrieben werden.

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

Das Portal ist danach unter `http://<LXC-IP>:80` erreichbar. Die IP-Adresse des LXC kann mit `hostname -I` ermittelt werden. Der Port kann über `HOMELAB_PORT` beim Installationsaufruf angepasst werden.

## 6. Reverse Proxy und HTTPS

Für den Zugriff im Heimnetz reicht der direkte Port 80. Für einen komfortablen Hostnamen und HTTPS sollte ein Reverse Proxy wie Caddy oder Nginx vorgeschaltet werden.

Der Reverse Proxy muss an die Container-IP und den konfigurierten Port weiterleiten. Die Anwendung selbst besitzt aktuell keine Authentifizierung. Deshalb darf der Portalport nicht ungeschützt aus dem Internet erreichbar sein.

## 7. Manuelles Update

Das Administrationsmodul kann die installierte Version gegen das neueste stabile GitHub-Release prüfen. Bis der authentifizierte Aufruf aus der WebUI eingerichtet ist, kann das Installationsscript erneut über die Container-Konsole gestartet werden. Es erkennt die bestehende Installation automatisch:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"
```

Alternativ kann das Update weiterhin manuell ausgeführt werden:

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

Nach dem Start prüfen:

```bash
curl --fail http://127.0.0.1:80/api/config > /dev/null
```

Wenn der Build fehlschlägt, darf der Service nicht gestartet werden. Die vorherige Version bleibt dann installiert. Bei einem Fehler nach dem Start den Service wieder stoppen, die Ursache mit `journalctl -u homelab-portal` prüfen und bei Bedarf den letzten funktionierenden Git-Stand auschecken.

Der automatische Ablauf protokolliert seine Ausgaben in `/var/log/homelab-portal/homelab-portal-update.log`. Nach einem Fehler kann der Service mit `systemctl start homelab-portal` gestartet und das Update-Log mit `tail -n 200 /var/log/homelab-portal/homelab-portal-update.log` geprüft werden.

## 8. Update-Script für LXC

Die Anwendung kann sich nicht verlässlich selbst aktualisieren, während ihr eigener Node-Prozess ersetzt und neu gestartet wird. Der UI-Aufruf startet deshalb über `systemd-run` eine eigene transient Unit. So kann das Update den Portal-Service stoppen, ohne dass das Update-Script selbst beendet wird.

Beispiel für `/usr/local/sbin/homelab-portal-update`:

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
curl --fail --retry 10 --retry-delay 1 http://127.0.0.1:80/api/config > /dev/null

echo "Update erfolgreich: $(git rev-parse --short HEAD)"
```

Script schuetzen:

```bash
chmod 750 /usr/local/sbin/homelab-portal-update
chown root:root /usr/local/sbin/homelab-portal-update
```

Das Script verwendet `git reset --hard origin/main`. Es darf nur eingesetzt werden, wenn der Installationsordner keine lokalen Quellcodeänderungen enthält. Die Konfiguration liegt außerhalb der Git-Änderungen und wird separat gesichert.

## 9. WebUI-Update sicher freigeben

Vor einem Update-Button in der WebUI müssen mindestens folgende Punkte umgesetzt werden:

1. Admin-Authentifizierung oder vorgeschaltete Reverse-Proxy-Authentifizierung.
2. Serverroute, die nur das feste Update-Script starten darf.
3. Keine frei übergebbaren Shell-Befehle, URLs oder Branches.
4. Ein Lock gegen parallele Updates.
5. Statusanzeige für `running`, `success` und `failed`.
6. Backup und Healthcheck vor einer Erfolgsmeldung.
7. Begrenzte Berechtigung, idealerweise über einen eigenen Systembenutzer und eine enge `sudoers`-Regel.

Das Update-Script darf niemals direkt mit Daten aus einem Formular zusammengesetzt werden.

## 10. Fehlerdiagnose

```bash
systemctl status homelab-portal
journalctl -u homelab-portal -n 100 --no-pager
ss -ltnp | grep ':80 '
curl -i http://127.0.0.1:80/api/config
```

Wenn der Zugriff von außerhalb des Containers nicht funktioniert, zuerst die Container-IP, den Listener-Port, die Proxmox-Firewall und danach den Reverse Proxy prüfen.
