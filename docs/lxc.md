# LXC-Betrieb

Diese Anleitung beschreibt den empfohlenen Betrieb in einem Debian- oder Ubuntu-LXC auf Proxmox. Docker im LXC ist nicht erforderlich.

## Empfohlene LXC-Ressourcen

- Debian 13 oder Ubuntu 24.04
- Unprivilegierter Container
- Mindestens 1 vCPU
- Mindestens 512 MB RAM, empfohlen 1 GB
- Mindestens 4 GB Speicher, empfohlen 8 GB
- Statische IP oder DHCP-Reservierung

## Automatische Installation

Das Script [install-lxc.sh](../scripts/install-lxc.sh) installiert Systempakete und Node.js 26, klont das Portal nach `/opt/homelab-portal`, baut Client und Server und richtet einen gehärteten systemd-Service ein.

Als `root` im LXC:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"
```

Bei einer Neuinstallation fragt das Script nach dem Port. Mit Enter wird `80` übernommen. Nach erfolgreichem Healthcheck zeigt es die erkannte IP und vollständige Portal-Adresse an.

## Admin-Passwort

Die Installation erzeugt ein zufälliges Passwort:

```bash
sudo cat /var/lib/homelab-portal/admin-password
```

Das Passwort kann nach der Anmeldung unter „Allgemein“ geändert werden. Dabei werden andere aktive Admin-Sitzungen beendet.

## Laufzeit und Dateipfade

| Pfad | Zweck |
| --- | --- |
| `/opt/homelab-portal` | Anwendung und Git-Checkout |
| `/opt/homelab-portal/server/data/config.json` | Portal-Konfiguration |
| `/var/lib/homelab-portal/admin-password` | Persistentes Admin-Passwort |
| `/etc/homelab-portal/lxc.config` | Laufzeitparameter |
| `/var/log/homelab-portal` | Installations-, Update- und Betriebslogs |
| `/var/backups/homelab-portal` | Konfigurationsbackups |

Der Dienst läuft als unprivilegierter Benutzer `homelab-portal`. systemd beschränkt Dateisystemzugriff, Geräte, Kernelparameter und Linux-Capabilities; nur das Binden privilegierter Ports bleibt erlaubt.

## Parameter

Die Vorlage [lxc.config.example](../scripts/lxc.config.example) wird bei der Installation nach `/etc/homelab-portal/lxc.config` kopiert. Auskommentierte Zeilen verwenden den Standardwert.

Wichtige Parameter:

| Parameter | Standard | Zweck |
| --- | --- | --- |
| `HOMELAB_PORT` | `80` | HTTP-Port |
| `APP_ENV` | `production` | `development` aktiviert DEV-API und DEV-Diagnose |
| `REPOSITORY_BRANCH` | `main` | Update-Branch |
| `TRUST_PROXY` | `false` | Vertraut einem vorgeschalteten Proxy |
| `FORCE_SECURE_COOKIES` | `false` | Erzwingt Secure-Cookies |
| `ALLOW_INSECURE_TLS` | `false` | Erlaubt selbstsignierte Zertifikate bei Statusprüfungen |

Nach Änderungen:

```bash
sudo systemctl restart homelab-portal
```

## Port ändern

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)" -- --switch 8080
```

Das Script ändert nur den Service-Port, startet den Dienst neu und prüft den Healthcheck.

## Updates

Erneutes Ausführen des Installationsscripts erkennt eine vorhandene Installation und aktualisiert sie:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/install-lxc.sh)"
```

Alternativ kann ein verfügbares Update im angemeldeten Admin-Bereich gestartet werden. Die Anwendung legt nach Session- und CSRF-Prüfung ausschließlich eine feste Triggerdatei an. Eine root-eigene systemd-Path-Unit startet anschließend `/usr/local/sbin/homelab-portal-update`.

Der Updateablauf:

1. Sperrt parallele Updates.
2. Sichert `config.json`.
3. Aktualisiert Node.js auf Version 26.
4. Holt `origin/main` beziehungsweise den konfigurierten Branch.
5. Installiert Abhängigkeiten und baut Client und Server.
6. Startet den Dienst und prüft bis zu 30 Sekunden den Healthcheck.
7. Führt bei Build- oder Healthcheck-Fehlern ein Rollback aus.

## Service und Logs

```bash
systemctl status homelab-portal
journalctl -u homelab-portal -n 100 --no-pager
tail -n 200 /var/log/homelab-portal/homelab-portal-install.log
tail -n 200 /var/log/homelab-portal/homelab-portal-update.log
```

Installierte Hilfs-Units:

- `homelab-portal.service`
- `homelab-portal-update.path` und `homelab-portal-update.service`
- `homelab-portal-log-rotation.timer` und `homelab-portal-log-rotation.service`

## Fehlerdiagnose

```bash
systemctl status homelab-portal
journalctl -u homelab-portal -n 100 --no-pager
ss -ltnp | grep ':80 '
curl -i http://127.0.0.1:80/api/config
```

Bei einem anderen Port die Befehle entsprechend anpassen. Wenn der lokale Healthcheck funktioniert, aber kein externer Zugriff möglich ist, anschließend LXC-IP, Proxmox-Firewall und Reverse Proxy prüfen.

Weitere Hinweise zu Backups, Logrotation und Updates stehen unter [Betrieb](operations.md).
