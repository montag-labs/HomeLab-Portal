# Konfiguration

Das öffentliche Portal ist ohne Anmeldung erreichbar. Änderungen erfolgen im geschützten Admin-Bereich unter `/admin`.

## Allgemeine Einstellungen

Unter „Allgemein“ können Sprache, Akzentfarbe und Admin-Passwort geändert sowie die vollständige Portal-Konfiguration importiert oder exportiert werden.

Das helle oder dunkle Theme wird direkt im Portal umgeschaltet und im jeweiligen Browser gespeichert. Der Wert `settings.theme` in vorhandenen Konfigurationsdateien dient nur als Standard, solange im Browser noch keine Auswahl gespeichert wurde.

## Kategorien und Apps

Unter „Kategorien & Apps“ lassen sich:

- Kategorien anlegen, sortieren, umbenennen und löschen
- Kategorien standardmäßig ein- oder ausklappen
- Apps anlegen, bearbeiten, verschieben, sortieren und löschen
- Externe Domain und lokale Adresse getrennt hinterlegen
- Icons automatisch erkennen, aus dem lokalen Katalog auswählen oder per URL setzen

Ein Klick auf die App-Karte öffnet bevorzugt die externe Domain und verwendet die lokale Adresse, wenn keine Domain konfiguriert ist. Beide Adressen werden für den gemeinsamen Erreichbarkeitsstatus geprüft und separat als Links angezeigt.

## Dashboards

Unter „Dashboard“ lässt sich eine Monitoring- oder Statusoberfläche direkt in das Portal einbetten. Der Dashboard-Hub bietet vier Varianten:

- **Grafana** für Metriken und eigene Observability-Dashboards
- **Netdata** für vorkonfigurierte Live-Systemmetriken
- **Uptime Kuma** für veröffentlichte Statusseiten
- **Eigene URL** für andere Weboberflächen mit Iframe-Unterstützung

Anbieter auswählen, Anzeigename und vollständige URL eintragen, die Live-Vorschau prüfen und das Dashboard aktivieren. Beim Grafana-Preset können zusätzlich UID, Slug, Zeitraum und Aktualisierungsintervall gesetzt werden. Das aktive Portal-Theme wird weiterhin als Grafana-Themeparameter übergeben.

HomeLab-Portal speichert keine Zugangsdaten. Der Zielserver muss die Einbettung erlauben; blockierende `X-Frame-Options`- oder `Content-Security-Policy`-Header können vom Portal nicht umgangen werden. Die Portal-Toolbar bietet deshalb immer einen Link zum Öffnen in einem eigenen Tab.

Anbieterspezifische Hinweise:

- [Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/) benötigt bei selbst gehosteten Installationen in der Regel `allow_embedding = true`. Anmeldung und Drittanbieter-Cookies können zusätzliche Reverse-Proxy- oder Cookie-Einstellungen erfordern.
- Bei [Netdata](https://learn.netdata.cloud/docs/dashboards-and-charts) kann eine lokale Agent-/Parent-URL oder eine erreichbare Cloud-Ansicht verwendet werden. Anmeldung und Tarif können die Einbettung beeinflussen.
- Für [Uptime Kuma](https://github.com/louislam/uptime-kuma/wiki/Status-Page) sollte eine veröffentlichte Statusseite verwendet werden. `UPTIME_KUMA_DISABLE_FRAME_SAMEORIGIN=true` erlaubt die Iframe-Nutzung, senkt aber den Clickjacking-Schutz und sollte nur bewusst in einer geschützten Umgebung eingesetzt werden.

## Konfigurationsdatei

Die produktive Konfiguration liegt im Repository-Checkout unter:

```text
server/data/config.json
```

Sie wird beim ersten Start aus [config.default.json](../server/data/config.default.json) erzeugt und ist durch `.gitignore` vom Repository ausgeschlossen.

Hauptstruktur:

```json
{
  "settings": {
    "language": "de",
    "theme": "dark",
    "accentColor": "#3b82f6",
    "logPolicy": {
      "rotation": "day",
      "archiveCount": 7
    },
    "dashboard": {
      "enabled": false,
      "provider": "grafana",
      "title": "Grafana",
      "url": "",
      "dashboardUid": "",
      "dashboardSlug": "",
      "timeRange": "now-6h",
      "refreshInterval": ""
    }
  },
  "categories": []
}
```

`provider` akzeptiert `grafana`, `netdata`, `uptime-kuma` oder `custom`. Bestehende Konfigurationen mit dem früheren Feld `settings.grafana` werden beim Lesen automatisch in das neue Dashboard-Format übernommen.

Manuelle Änderungen sollten nur bei gestopptem Dienst und nach einem Backup erfolgen. Der sicherere Weg ist die Admin-Oberfläche oder Export, Bearbeitung und erneuter Import.

## Import und Export

Der Export enthält Einstellungen, Kategorien und Apps, aber kein Admin-Passwort und keine Sitzungsdaten. Importierte Daten werden serverseitig validiert und ersetzen die aktuelle Portal-Konfiguration vollständig.

Vor einem Import:

1. Aktuelle Konfiguration exportieren.
2. JSON-Syntax und URLs prüfen.
3. Keine Zugangsdaten in URLs einbetten.

## Relevante Laufzeitvariablen

| Variable | Zweck |
| --- | --- |
| `PORT` / `HOMELAB_PORT` | HTTP-Port; `HOMELAB_PORT` hat Vorrang |
| `APP_ENV` / `NODE_ENV` | `development` aktiviert die DEV-Routen |
| `UPDATE_MODE` | `docker`, `lxc` oder nicht unterstützt |
| `ADMIN_PASSWORD` | Initiales Passwort aus der Umgebung |
| `ADMIN_PASSWORD_FILE` | Datei mit initialem Passwort |
| `ADMIN_PASSWORD_STORE_FILE` | Persistente Passwortdatei nach Änderungen |
| `LOG_DIR` | Verzeichnis der administrativen Logs |
| `TRUST_PROXY` | Vertraut bei `true` einem vorgeschalteten Proxy |
| `FORCE_SECURE_COOKIES` | Erzwingt Secure-Cookies |
| `ALLOW_INSECURE_TLS` | Deaktiviert die Zertifikatsprüfung für Statuschecks |

Betriebsspezifische Pfade und Beispiele stehen in [Docker](docker.md) und [LXC](lxc.md).
