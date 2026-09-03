# Docker-Betrieb

Diese Anleitung beschreibt Installation, Konfiguration und Aktualisierung mit Docker Compose. Das veröffentlichte Multi-Arch-Image heißt `montaglabs/homelab-portal` und unterstützt `linux/amd64` sowie `linux/arm64`.

## Voraussetzungen

- Docker Engine
- Docker Compose v2
- Git, wenn Updates über `scripts/update-docker.sh` erfolgen sollen

## Installation

```bash
git clone https://github.com/montag-labs/HomeLab-Portal.git
cd HomeLab-Portal
mkdir -p server/data/logs
```

Ein kurzlebiger Initialisierungscontainer setzt beim Start ausschließlich für `server/data` den Eigentümer auf UID/GID `1000:1000`. Anschließend startet der eigentliche Portal-Container als unprivilegierter Benutzer `node`; seine übrigen Härtungseinstellungen bleiben aktiv.

Eine nicht versionierte `.env`-Datei anlegen:

```dotenv
ADMIN_PASSWORD=ein-langes-zufaelliges-passwort
```

OIDC kann nach der ersten Passwortanmeldung direkt im Admin-Modul „OpenID Connect“ eingerichtet werden. Optional kann die Konfiguration stattdessen in derselben Datei verwaltet werden; diese Werte haben Vorrang und werden im Admin-Modul schreibgeschützt angezeigt:

```dotenv
OIDC_ISSUER_URL=https://auth.example.com/application/o/homelab-portal/
OIDC_CLIENT_ID=homelab-portal
OIDC_CLIENT_SECRET=client-secret
OIDC_REDIRECT_URI=https://portal.example.com/api/auth/oidc/callback
OIDC_ALLOWED_GROUPS=homelab-admins
OIDC_DISPLAY_NAME=Authentik
```

Die Redirect-URI muss beim Identity Provider exakt registriert sein. Der Gruppen-Claim muss im ID-Token enthalten sein. Das Passwort sollte erst nach einem erfolgreichen SSO-Test mit `OIDC_DISABLE_PASSWORD_LOGIN=true` deaktiviert werden.

Anschließend starten:

```bash
docker compose up -d
docker compose ps
```

Das Portal ist standardmäßig unter <http://localhost:4000> erreichbar. Der Admin-Bereich liegt unter <http://localhost:4000/admin>.

## Persistente Daten

Docker Compose bindet folgende Hostpfade ein:

| Hostpfad | Containerpfad | Inhalt |
| --- | --- | --- |
| `./server/data` | `/app/server/data` | Konfiguration, gespeichertes Admin-Passwort und Logs |

Die Konfigurationsvorlage liegt zusätzlich im Image. Ein leerer Datenordner wird beim ersten Start automatisch initialisiert.

## Umgebungsvariablen

| Variable | Standard | Zweck |
| --- | --- | --- |
| `ADMIN_PASSWORD` | erforderlich | Initiales Admin-Passwort und standardmäßiger SSO-Notfallzugang |
| `OIDC_ISSUER_URL` | leer | Issuer-URL des OpenID Providers |
| `OIDC_CLIENT_ID` | leer | OIDC-Client-ID |
| `OIDC_CLIENT_SECRET` | leer | Client-Secret, bei öffentlichen Clients optional |
| `OIDC_REDIRECT_URI` | leer | Exakte registrierte Callback-URL |
| `OIDC_ALLOWED_GROUPS` | leer | Erforderliche, kommaseparierte Admin-Gruppen |
| `OIDC_GROUPS_CLAIM` | `groups` | Claim-Pfad für die Gruppenprüfung |
| `OIDC_SCOPES` | `openid profile email groups` | Angeforderte OIDC-Scopes |
| `OIDC_DISPLAY_NAME` | `Single Sign-on` | Beschriftung der SSO-Schaltfläche |
| `OIDC_CLIENT_AUTH_METHOD` | automatisch | Mit Secret `client_secret_post`, sonst `none`; alternativ `client_secret_basic` |
| `OIDC_DISABLE_PASSWORD_LOGIN` | `false` | Deaktiviert den Passwort-Login nach erfolgreichem SSO-Test |
| `TRUST_PROXY` | `false` | Vertraut genau einem vorgeschalteten Proxy bei `true` |
| `FORCE_SECURE_COOKIES` | `false` | Erzwingt das `Secure`-Attribut für Session-Cookies |
| `ALLOW_INSECURE_TLS` | `false` | Deaktiviert nur für Statusprüfungen die TLS-Zertifikatsprüfung |

Änderungen an diesen Werten werden nach `docker compose up -d --force-recreate` wirksam. Das Admin-Passwort kann nach der Anmeldung unter „Allgemein“ geändert werden und wird in `server/data/admin-password` gespeichert.

## Port ändern

In `docker-compose.yml` die linke Seite der Portzuordnung ändern:

```yaml
ports:
  - "8080:4000"
```

Danach ist das Portal unter `http://<Host>:8080` erreichbar.

## Update

Das Portal zeigt verfügbare Versionen an, führt Docker-Updates aber bewusst nicht im Container aus. Auf dem Docker-Host:

```bash
bash scripts/update-docker.sh
```

Das Script aktualisiert das Repository auf `origin/main`, lädt `montaglabs/homelab-portal:latest` und erstellt den Container neu. Lokale Quellcodeänderungen im Installationsverzeichnis werden dabei verworfen.

Alternativ:

```bash
git pull --ff-only
docker compose pull
docker compose up -d --pull always --force-recreate --remove-orphans
```

## Logs und Diagnose

```bash
docker compose ps
docker compose logs -f homelab-portal
docker inspect --format "{{json .State.Health}}" homelab-portal
```

Die administrative Logansicht verwendet `server/data/logs`. Für automatische Rotation kann `scripts/rotate-logs.sh` regelmäßig per Cron oder systemd-Timer auf dem Host gestartet werden.

## Lokales Image bauen

```bash
docker build -t homelab-portal:local .
```

Für den lokalen Build in `docker-compose.yml` vorübergehend das Image anpassen oder den Container direkt starten. Das offizielle Compose-Setup zieht standardmäßig immer `montaglabs/homelab-portal:latest`.

## Reverse Proxy

Für Zugriffe außerhalb eines vertrauenswürdigen Netzes wird HTTPS über einen Reverse Proxy empfohlen:

1. Nur den Reverse Proxy öffentlich erreichbar machen.
2. `TRUST_PROXY=true` setzen, wenn der Proxy vertrauenswürdig ist.
3. `FORCE_SECURE_COOKIES=true` setzen, wenn das Portal ausschließlich per HTTPS genutzt wird.
4. WebSocket-Unterstützung ist nicht erforderlich; normale HTTP-Weiterleitung genügt.

Weitere Betriebs- und Sicherheitshinweise stehen unter [Betrieb](operations.md) und in der [Sicherheitsrichtlinie](../SECURITY.md).
