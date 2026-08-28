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

## Grafana

Unter „Dashboard“ kann ein Grafana-Dashboard eingebettet werden:

1. Grafana aktivieren.
2. Basis- oder Dashboard-URL eintragen.
3. Optional Dashboard-UID und Slug ergänzen.
4. Zeitraum und Aktualisierungsintervall wählen.
5. Einstellungen speichern.

HomeLab-Portal speichert keine Grafana-Zugangsdaten. Grafana muss das Einbetten erlauben, beispielsweise mit `allow_embedding = true`. Drittanbieter-Cookies oder Reverse-Proxy-Regeln können die Anmeldung im Iframe verhindern; in diesem Fall das Dashboard über den angebotenen Link in einem eigenen Tab öffnen.

Das aktive Portal-Theme wird als Grafana-Themeparameter weitergegeben.

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
    "grafana": {
      "enabled": false,
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
