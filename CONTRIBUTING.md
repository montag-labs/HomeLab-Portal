# Beitragen

Danke für dein Interesse am HomeLab-Portal.

## Lokale Einrichtung

```bash
git clone https://github.com/montag-labs/HomeLab-Portal.git
cd HomeLab-Portal
npm run install:all
npm run dev
```

## Vor einem Pull Request

```bash
npm run lint --prefix client
npm run build
```

Änderungen bitte fokussiert halten. Bei UI-Änderungen beide Sprachvarianten in `client/src/i18n` aktualisieren. Bei Konfigurationsänderungen Client-Typen, Server-Typen, Zod-Schema und Default-Konfiguration gemeinsam prüfen.

## Pull Requests

- Aussagekraeftigen Titel verwenden, zum Beispiel `fix: ...` oder `feat: ...`.
- Beschreiben, welches Problem geloest wird.
- Relevante Test- oder Build-Befehle angeben.
- Bei UI-Änderungen Screenshots oder eine kurze Beschreibung der betroffenen Ansicht ergänzen.
- Keine Zugangsdaten, Tokens oder privaten Konfigurationsdateien committen.

## Commit-Konvention

Bevorzugt werden kurze Conventional-Commit-Titel:

- `feat:` für neue Funktionen
- `fix:` für Fehlerbehebungen
- `docs:` für Dokumentation
- `refactor:` für strukturelle Änderungen
- `chore:` für Wartung

## Releases

Releases werden über einen SemVer-Git-Tag im Format `vX.Y.Z` ausgelöst. Der GitHub-Release-Name entspricht ausschließlich dem Tag, zum Beispiel `v0.1.23`.
