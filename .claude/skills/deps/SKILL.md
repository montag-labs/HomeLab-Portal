---
name: deps
description: Abhängigkeiten von HomeLab-Portal lokal prüfen und aktualisieren (npm outdated/audit für client und server, GitHub-Actions-Versionen, Docker-Basisimage). Verwenden, wenn der Nutzer Updates einspielen will oder "/deps" aufruft.
---

# /deps – lokale Abhängigkeits-Updates

Ersetzt Dependabot. Es gibt keine Bot-PRs; Updates laufen lokal und enden in einem Commit des Nutzers.

## Ablauf

1. Arbeitsbaum muss sauber sein (`git status`), sonst nachfragen.
2. Prüfen, jeweils in `client/` und `server/`:
   - `npm outdated`
   - `npm audit --omit=dev` (Sicherheitsfunde zuerst melden)
3. Zusätzlich prüfen: Action-Versionen in `.github/workflows/*.yml` und das Basisimage im `Dockerfile` gegen die aktuellen Releases.
4. Ergebnis als Tabelle ausgeben, sortiert: **Sicherheitsfix** > **Patch/Minor** > **Major**.
5. Patch/Minor und Sicherheitsfixes in einem Rutsch einspielen (`npm update` bzw. gezielt `npm install pkg@version`, Lockfile mitnehmen). **Majors nur nach Rückfrage**, einzeln, mit Blick auf den Changelog des Pakets.
6. Prüfen:
   ```bash
   npm run lint --prefix client
   npm test --prefix client
   npm test --prefix server
   npm run test:types --prefix server
   npm run build
   ```
   Bei Fehlern das betroffene Update zurücknehmen und melden, nicht erzwingen.
7. Unter `## [Unreleased]` in `CHANGELOG.md` eine Zeile ergänzen (z. B. "Abhängigkeiten aktualisiert: …").
8. Ein Commit `chore(deps): <Kurzfassung>`. Kein `Co-Authored-By`. Nicht pushen, bevor der Nutzer es sagt.

## Wöchentlicher Audit-Check

Die geplante Aufgabe `homelab-portal-audit` führt nur `npm audit --omit=dev` aus und meldet High/Critical-Funde. Sie ändert nichts. Eingespielt wird dann hier mit `/deps`.
