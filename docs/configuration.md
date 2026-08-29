# Konfiguration

Das öffentliche Portal ist ohne Anmeldung erreichbar. Änderungen erfolgen im geschützten Admin-Bereich unter `/admin`.

## Allgemeine Einstellungen

Unter „Allgemein“ können Sprache, Akzentfarbe und Admin-Passwort geändert sowie die vollständige Portal-Konfiguration importiert oder exportiert werden.

Das helle oder dunkle Theme wird direkt im Portal umgeschaltet und im jeweiligen Browser gespeichert. Der Wert `settings.theme` in vorhandenen Konfigurationsdateien dient nur als Standard, solange im Browser noch keine Auswahl gespeichert wurde.

## Single Sign-on mit OpenID Connect

Der Admin-Bereich unterstützt generisches OpenID Connect (OIDC), beispielsweise mit Authentik, Keycloak, Authelia oder Microsoft Entra ID. Beim Identity Provider muss folgende Redirect-URI registriert werden:

```text
https://portal.example.com/api/auth/oidc/callback
```

SSO wird absichtlich nur aktiviert, wenn `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI` und mindestens eine `OIDC_ALLOWED_GROUPS`-Gruppe gesetzt sind. Der Gruppen-Claim muss im ID-Token enthalten sein. Mehrere erlaubte Gruppen werden kommasepariert angegeben; der Claim-Pfad unterstützt Punkte, beispielsweise `realm_access.roles`.

Der Flow verwendet Authorization Code, PKCE, `state` und `nonce`. Nach erfolgreicher Gruppenprüfung wird eine normale serverseitige Admin-Sitzung mit dem bestehenden CSRF-Schutz erstellt. OIDC-Tokens werden weder an den Browser weitergegeben noch in der Portal-Konfiguration gespeichert.

Das lokale Admin-Passwort bleibt standardmäßig als Notfallzugang aktiv. Erst nach einem erfolgreichen SSO-Test sollte `OIDC_DISABLE_PASSWORD_LOGIN=true` gesetzt werden. Für produktives SSO werden HTTPS, `FORCE_SECURE_COOKIES=true` und bei einem vertrauenswürdigen Reverse Proxy `TRUST_PROXY=true` empfohlen.

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
| `OIDC_ISSUER_URL` | Exakte Issuer-URL des OpenID Providers |
| `OIDC_CLIENT_ID` | Registrierte Client-ID |
| `OIDC_CLIENT_SECRET` | Client-Secret; bei öffentlichen Clients optional |
| `OIDC_REDIRECT_URI` | Registrierte Callback-URL des Portals |
| `OIDC_ALLOWED_GROUPS` | Erforderliche, kommaseparierte Admin-Gruppen |
| `OIDC_GROUPS_CLAIM` | Claim-Pfad für Gruppen, Standard `groups` |
| `OIDC_SCOPES` | Angeforderte Scopes, Standard `openid profile email groups` |
| `OIDC_DISPLAY_NAME` | Anzeigename des SSO-Anbieters |
| `OIDC_CLIENT_AUTH_METHOD` | `client_secret_post`, `client_secret_basic` oder `none` |
| `OIDC_DISABLE_PASSWORD_LOGIN` | Deaktiviert den Passwort-Login nur bei vollständig konfiguriertem OIDC |
| `LOG_DIR` | Verzeichnis der administrativen Logs |
| `TRUST_PROXY` | Vertraut bei `true` einem vorgeschalteten Proxy |
| `FORCE_SECURE_COOKIES` | Erzwingt Secure-Cookies |
| `ALLOW_INSECURE_TLS` | Deaktiviert die Zertifikatsprüfung für Statuschecks |

Betriebsspezifische Pfade und Beispiele stehen in [Docker](docker.md) und [LXC](lxc.md).
