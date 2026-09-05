# Beitragen

Danke für dein Interesse am HomeLab-Portal.

## Lokale Einrichtung

Erforderlich sind Node.js 26, npm und Git.

```bash
git clone https://github.com/montag-labs/HomeLab-Portal.git
cd HomeLab-Portal
npm run install:all
```

Für die Admin-Anmeldung `ADMIN_PASSWORD` mit einem mindestens 12 Zeichen langen Testpasswort setzen und anschließend `npm run dev` starten. Weitere Hinweise stehen in der [Entwicklungsdokumentation](docs/development.md).

## Vor einem Pull Request

```bash
npm run lint --prefix client
npm run build
```

Änderungen bitte fokussiert halten. Besonders beachten:

- Bei UI-Texten beide Sprachdateien unter `client/src/i18n` aktualisieren.
- Bei Konfigurationsfeldern Client-Typen, Server-Typen, Zod-Schema, Default-Konfiguration und Dokumentation gemeinsam prüfen.
- Bei UI-Änderungen Screenshots der betroffenen Ansichten ergänzen oder aktualisieren.
- Keine Zugangsdaten, Tokens, privaten URLs oder `server/data/config.json` committen.
- Geänderte Betriebsabläufe in `docs/` nachziehen.

## Pull Requests

- Aussagekräftigen Titel verwenden, zum Beispiel `fix: ...` oder `feat: ...`.
- Problem und Lösung kurz beschreiben.
- Ausgeführte Prüfungen und relevante Plattformen nennen.
- Migrations- oder Konfigurationsschritte ausdrücklich dokumentieren.

## Commit-Konvention

Bevorzugt werden kurze Conventional-Commit-Titel:

- `feat:` für neue Funktionen
- `fix:` für Fehlerbehebungen
- `docs:` für Dokumentation
- `refactor:` für strukturelle Änderungen
- `chore:` für Wartung
- `release:` für vorbereitete Versionen

## Releases

Releases folgen Semantic Versioning. Ein Tag im Format `vX.Y.Z` startet die Erstellung des GitHub-Releases und des Multi-Arch-Docker-Images. Der genaue Ablauf ist unter [Entwicklung und Releases](docs/development.md#releases) beschrieben.
