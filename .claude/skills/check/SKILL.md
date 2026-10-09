---
name: check
description: Führt die CI-Prüfungen von HomeLab-Portal lokal aus (Lint, Tests, Typecheck, Build). Verwenden vor einem Push oder wenn der Nutzer "/check" aufruft.
---

# /check – lokale CI

Führt dieselben Schritte aus wie `.github/workflows/ci.yml`. Nacheinander, bei Fehler stoppen und die Ursache melden (nicht umgehen):

```bash
npm run lint --prefix client
npm test --prefix client
npm test --prefix server
npm run test:types --prefix server
npm run build
```

Zusätzlich:

- `CHANGELOG.md` enthält `## [Unreleased]` und einen Eintrag `## [x.y.z]`.
- `npm audit --omit=dev --audit-level=high` in `client/` und `server/` meldet nichts.

Am Ende eine kurze Übersicht: Schritt, Ergebnis (ok/Fehler), bei Fehlern die relevanten Zeilen.
