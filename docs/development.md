# Entwicklung

## Voraussetzungen

- Node.js 26
- npm
- Git

## Lokale Einrichtung

```bash
git clone https://github.com/montag-labs/HomeLab-Portal.git
cd HomeLab-Portal
npm run install:all
```

Für die lokale Admin-Anmeldung eine Umgebungsvariable setzen.

Linux/macOS:

```bash
export ADMIN_PASSWORD='ein-langes-zufaelliges-passwort'
npm run dev
```

PowerShell:

```powershell
$env:ADMIN_PASSWORD = "ein-langes-zufaelliges-passwort"
npm run dev
```

- Vite-Frontend: <http://localhost:5173>
- API: <http://localhost:4000>
- Administration: <http://localhost:5173/admin>

Vite leitet `/api` an Port `4000` weiter.

## Projektstruktur

| Pfad | Inhalt |
| --- | --- |
| `client/` | React 19, TypeScript und Vite |
| `server/` | Express, TypeScript und Zod |
| `server/data/` | Default- und lokale Laufzeitkonfiguration |
| `scripts/` | LXC-, Docker-, Update- und Logrotationsskripte |
| `docs/` | Betriebs- und Entwicklungsdokumentation |

Im Produktivbetrieb liefert der Express-Server das gebaute Frontend aus `client/dist` aus.

## Qualitätsprüfungen

```bash
npm run lint --prefix client
npm test --prefix client
npm test --prefix server
npm run build
```

Der vollständige Build kompiliert Client und Server. Die Test-Suiten prüfen Konfigurationsvalidierung und Migrationen sowie öffentliche und administrative Zugriffsgrenzen. Änderungen an Konfigurationsfeldern müssen gemeinsam in Client-Typen, Server-Typen, Zod-Schema, Default-Konfiguration und Dokumentation berücksichtigt werden.

## Entwicklungsdiagnose

Wenn `APP_ENV=development` oder `NODE_ENV=development` gesetzt ist, werden zusätzlich registriert:

- `GET /api/dev/enabled`
- `GET /api/dev/debug`

Der Admin-Bereich zeigt dann „DEV-Diagnose“. Die Ausgabe enthält Laufzeit-, Konfigurations- und Erreichbarkeitsinformationen; bekannte Passwort-, Token- und Schlüsselfelder werden gefiltert. DEV darf nicht auf öffentlich erreichbaren Produktivinstanzen aktiviert werden.

## Releases

Versionen folgen Semantic Versioning. Für einen Release:

1. Version in Root-, Client- und Server-Paketdateien sowie Lockfiles erhöhen.
2. `CHANGELOG.md` aktualisieren: Abschnitt `[Unreleased]` nach `[X.Y.Z] - Datum` überführen. Dieser Abschnitt wird zum Text des GitHub-Releases.
3. Lint und vollständigen Build ausführen.
4. Als Pull Request nach `main` mergen (die Pflicht-Checks `validate` und `docker` müssen grün sein).
5. Tag `vX.Y.Z` auf den Merge-Commit setzen und pushen.

Nur stabile Tags (`vX.Y.Z`) starten die Workflows; Vorabversionen wie `v1.8.0-rc1` lösen nichts aus. Vor dem Veröffentlichen prüft `verify-release.yml`:

- Der Tag passt zu den Versionen in allen drei `package.json` und zu einem Eintrag im Changelog.
- Die CI (`validate` und `docker`) ist für den getaggten Commit erfolgreich. Die Prüfung wartet bis zu 20 Minuten auf noch laufende Checks.

Danach laufen zwei GitHub-Actions-Workflows:

- Erstellung eines GitHub-Releases mit dem Changelog-Abschnitt als Text (`scripts/release-notes.sh`)
- Build und Veröffentlichung von `montaglabs/homelab-portal` für `linux/amd64` und `linux/arm64` mit den Tags `X.Y.Z`, `X.Y`, `vX.Y.Z` und `latest`

Der LXC-Betrieb und `scripts/update-docker.sh` installieren den neuesten stabilen Release, nicht den Stand von `main`.

Erforderliche Repository-Secrets für Docker Hub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Weitere Regeln stehen in [CONTRIBUTING.md](../CONTRIBUTING.md).
