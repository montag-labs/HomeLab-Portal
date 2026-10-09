---
name: release
description: Neuen Release von HomeLab-Portal vorbereiten (Version, Changelog, Prüfungen, Commit, Tag). Verwenden bei "/release X.Y.Z" oder wenn der Nutzer einen Release will.
---

# /release X.Y.Z

Folgt `docs/development.md` (Abschnitt Releases). Argument: neue Version `X.Y.Z` (stabil, ohne Suffix). Fehlt sie, Vorschlag nach SemVer aus `## [Unreleased]` machen und bestätigen lassen.

## Ablauf

1. Voraussetzungen: Branch `main`, sauberer Arbeitsbaum, `git pull --ff-only`. Sonst abbrechen und nachfragen.
2. `## [Unreleased]` darf nicht leer sein. Sonst abbrechen.
3. Version in `package.json`, `client/package.json`, `server/package.json` setzen und die Lockfiles (`package-lock.json` im Root, in `client/` und `server/`) anpassen, z. B. mit `npm version X.Y.Z --no-git-tag-version` im jeweiligen Ordner. Prüfen, dass sich in den Lockfiles nur die Version geändert hat.
4. `CHANGELOG.md`: `## [Unreleased]` stehen lassen (leer), darunter `## [X.Y.Z] - <heutiges Datum>` mit dem bisherigen Inhalt. Dieser Abschnitt wird der GitHub-Release-Text.
5. `/check` ausführen (Lint, Tests, Typecheck, Build). Bei Fehlern abbrechen.
6. Commit `release: vX.Y.Z`.
7. **Vor dem Pushen und Taggen den Nutzer fragen.** Erst nach Ok: `git push origin main`, warten bis die CI für den Commit grün ist (`gh run list`), dann `git tag vX.Y.Z` und `git push origin vX.Y.Z`.

`verify-release.yml` prüft danach Tag, Versionen, Changelog-Eintrag und CI. Tags `v*` sind per Ruleset gegen Löschen und Überschreiben geschützt; nie einen veröffentlichten Tag neu setzen.
