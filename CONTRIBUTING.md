# Beitragen

Danke fuer dein Interesse am HomeLab-Portal.

## Lokale Einrichtung

```bash
git clone https://github.com/Back-code/HomeLab-Portal.git
cd HomeLab-Portal
npm run install:all
npm run dev
```

## Vor einem Pull Request

```bash
npm run lint --prefix client
npm run build
```

Aenderungen bitte fokussiert halten. Bei UI-Aenderungen beide Sprachvarianten in `client/src/i18n` aktualisieren. Bei Konfigurationsaenderungen Client-Typen, Server-Typen, Zod-Schema und Default-Konfiguration gemeinsam pruefen.

## Pull Requests

- Aussagekraeftigen Titel verwenden, zum Beispiel `fix: ...` oder `feat: ...`.
- Beschreiben, welches Problem geloest wird.
- Relevante Test- oder Build-Befehle angeben.
- Bei UI-Aenderungen Screenshots oder eine kurze Beschreibung der betroffenen Ansicht ergaenzen.
- Keine Zugangsdaten, Tokens oder privaten Konfigurationsdateien committen.

## Commit-Konvention

Bevorzugt werden kurze Conventional-Commit-Titel:

- `feat:` fuer neue Funktionen
- `fix:` fuer Fehlerbehebungen
- `docs:` fuer Dokumentation
- `refactor:` fuer strukturelle Aenderungen
- `chore:` fuer Wartung
