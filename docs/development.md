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
2. `CHANGELOG.md` aktualisieren.
3. Lint und vollständigen Build ausführen.
4. Commit erstellen und nach `main` pushen.
5. Tag `vX.Y.Z` erstellen und pushen.

Der Tag startet zwei GitHub-Actions-Workflows:

- Erstellung eines GitHub-Releases
- Build und Veröffentlichung von `montaglabs/homelab-portal` für `linux/amd64` und `linux/arm64`

Erforderliche Repository-Secrets für Docker Hub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Weitere Regeln stehen in [CONTRIBUTING.md](../CONTRIBUTING.md).
