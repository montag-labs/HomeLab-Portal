# Betrieb

## Updateprüfung

Das Portal vergleicht die installierte Version mit dem neuesten stabilen GitHub-Release. Ergebnisse werden fünf Minuten zwischengespeichert; ein nicht erreichbares GitHub blockiert den Portalbetrieb nicht.

- **LXC:** Ein Update kann nach Admin-Anmeldung direkt angestoßen werden. Session und CSRF-Token schützen die Anfrage; die eigentliche Installation übernimmt ein root-eigener systemd-Service.
- **Docker:** Die Oberfläche zeigt Version und Release-Link. Das Update wird auf dem Host mit [update-docker.sh](../scripts/update-docker.sh) oder Docker Compose ausgeführt.

Details stehen in den Anleitungen für [Docker](docker.md) und [LXC](lxc.md).

## Backups

Mindestens folgende Dateien sichern:

| Betrieb | Daten |
| --- | --- |
| Docker | `server/data` |
| LXC | `/opt/homelab-portal/server/data/config.json` und `/var/lib/homelab-portal/admin-password` |

Beispiel für LXC:

```bash
sudo install -d -m 700 /var/backups/homelab-portal
sudo cp -a /opt/homelab-portal/server/data/config.json \
  /var/backups/homelab-portal/config-$(date +%Y%m%d-%H%M%S).json
sudo cp -a /var/lib/homelab-portal/admin-password \
  /var/backups/homelab-portal/admin-password-$(date +%Y%m%d-%H%M%S)
```

Konfigurationsexporte aus dem Admin-Bereich enthalten kein Admin-Passwort.

## Logs

Der Admin-Bereich kennt feste, nicht frei wählbare Logquellen:

- Installation
- LXC-Update
- Docker-Update
- Portal-Service
- Healthcheck
- Backup und Rollback

Logs können angezeigt, heruntergeladen, als `.gz` archiviert und geleert werden. Pro Ansicht wird höchstens das letzte MiB gelesen.

Die Rotationsrichtlinie besteht aus Intervall (`day`, `week`, `month` oder `year`) und Anzahl aufzubewahrender Archive zwischen 0 und 100.

- LXC prüft die Rotation täglich mit `homelab-portal-log-rotation.timer`.
- Docker kann [rotate-logs.sh](../scripts/rotate-logs.sh) per Cron oder Host-Timer ausführen.

## Healthcheck

Der öffentliche Konfigurationsendpunkt eignet sich als einfacher Healthcheck:

```bash
curl --fail http://127.0.0.1:4000/api/config > /dev/null
```

Im LXC standardmäßig Port `80` verwenden. Docker Compose enthält bereits einen Container-Healthcheck.

## Reverse Proxy und HTTPS

Der öffentliche Portalbereich besitzt absichtlich keine Anmeldung; administrative API-Routen sind geschützt. Trotzdem sollten Infrastruktur-URLs und Statusinformationen nur in einem vertrauenswürdigen Netz oder über einen abgesicherten Reverse Proxy veröffentlicht werden.

Empfehlungen:

- HTTPS am Reverse Proxy terminieren.
- Nur bekannte Proxy-IP-Adressen dürfen das Backend erreichen.
- `TRUST_PROXY=true` ausschließlich hinter diesem Proxy setzen.
- `FORCE_SECURE_COOKIES=true` setzen, wenn ausschließlich HTTPS verwendet wird.
- Admin-Passwort mit mindestens 12 Zeichen verwenden.
- `ALLOW_INSECURE_TLS=true` nur in kontrollierten Netzen und nur für notwendige selbstsignierte Ziele aktivieren.

## Wiederherstellung

1. Dienst oder Container stoppen.
2. `config.json` und gegebenenfalls `admin-password` aus dem Backup wiederherstellen.
3. Dateieigentümer und Rechte kontrollieren.
4. Dienst starten.
5. `/api/config` und Admin-Anmeldung prüfen.

Bei Docker müssen die Dateien für UID/GID `1000:1000` schreibbar sein. Im LXC gehören Laufzeitdaten dem Benutzer `homelab-portal` beziehungsweise die Passwortdatei `root:homelab-portal`.
