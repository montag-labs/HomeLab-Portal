# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

Ältere Versionen (vor 1.6.0) stehen im [Changelog-Archiv](docs/changelog-archive.md).

## [Unreleased]

## [1.7.0] - 2026-10-04

### Hinzugefügt

- Pro App lässt sich festlegen, dass bei der Statusprüfung Zertifikatsfehler (selbstsignierte Zertifikate) ignoriert werden. Das gilt je Domain bzw. lokaler Adresse und ersetzt die globale Variable `ALLOW_INSECURE_TLS` für die meisten Fälle.

### Geändert

- Abhängigkeiten aktualisiert, u. a. gridstack 14 (die Option `float: true` des Geräte-Rasters heißt dort `mode: "float"`), vite 8.3, vitest 5.0.3, zod 4.6 und jsdom 30.
- Der Server beendet sich bei `SIGTERM`/`SIGINT` geordnet (laufende Anfragen werden abgeschlossen, Timeout 10 s).
- Geräte-Scan in kleinere Module aufgeteilt (`services/scan/`), Verhalten unverändert.
- LXC-Installation und -Update sowie `update-docker.sh` verwenden den neuesten stabilen Release statt des Stands von `main`; Vorabversionen werden ignoriert und eine neuere installierte Version wird nie ersetzt. Der Kanal `branch` (`UPDATE_CHANNEL=branch`) bleibt für die Entwicklung möglich.
- Docker-Images erhalten zusätzlich die Tags `X.Y.Z` und `X.Y` (bisher `vX.Y.Z` und `latest`). Nur stabile Tags `vX.Y.Z` lösen Release und Image aus.
- Der GitHub-Release-Text stammt aus dem Changelog. Vor dem Veröffentlichen prüft die Pipeline Tag, Versionen in den `package.json`, Changelog-Eintrag und eine erfolgreiche CI für den getaggten Commit.
- Ältere Changelog-Einträge (vor 1.6.0) sind je Minor-Version zusammengefasst nach `docs/changelog-archive.md` verschoben.
- CI prüft zusätzlich die Test-Typen, produktive Abhängigkeiten per `npm audit` und baut das Docker-Image; Dependabot ist eingerichtet.
- Neue Tests für Anmeldung, CSRF, Sperre nach Fehlversuchen, Passwortwechsel, Subnetz-Prüfung und die TLS-Option pro App.

### Sicherheit

- Das Admin-Passwort wird als scrypt-Hash gespeichert. Bestehende Klartext-Dateien werden bei der nächsten erfolgreichen Anmeldung automatisch umgestellt. Ein Downgrade auf eine ältere Version ist danach nur mit gesetztem `ADMIN_PASSWORD` möglich.
- Die öffentliche Konfiguration (`/api/config`) enthält keine Admin-Einstellungen (Log-Richtlinie) mehr; der vollständige Export läuft über `/api/config/admin`.
- Bei der Passwort-Anmeldung wird eine bestehende Sitzung verworfen.

## [1.6.2] - 2026-09-19

### Behoben

- Bei fehlgeschlagenen Versionsprüfungen zeigt das Portal nur die installierte Version statt einer Fehlermeldung oder eines veralteten Aktualitätsstatus.

### Geändert

- Zeitlimit der GitHub-Versionsprüfung von 5 auf 15 Sekunden erhöht.
- Fehlerdiagnose im Portal-Service-Log um HTTP-Status, GitHub-Request-ID, Rate-Limit-Angaben, Netzwerkfehlercode und nächsten Prüfzeitpunkt ergänzt.
- Betriebsdokumentation und Regressionstests für Versionsanzeige und Fehlerprotokollierung ergänzt.

## [1.6.1] - 2026-09-16

### Behoben

- Beim Hinzufügen von Apps werden fehlende Namen und API-Fehler sichtbar angezeigt; Eingaben bleiben bei fehlgeschlagenem Speichern erhalten.
- Mehrfachklicks während des Speicherns werden verhindert.

### Geändert

- Domain und lokale IP erhalten beim Hinzufügen und Bearbeiten eine Auswahl zwischen HTTPS und HTTP. Standard ist HTTPS für Domains und HTTP für lokale IPs.
- Vollständig eingefügte URLs übernehmen ihr Protokoll automatisch; Ports und Pfade bleiben erhalten.
- Regressionstests für App-Erstellung, Protokollauswahl und Fehlermeldungen ergänzt.

## [1.6.0] - 2026-09-15

### Behoben

- Fehlgeschlagene Update-Prüfungen blockieren automatische Versuche nicht mehr für den gesamten Tag. Nach der Wartefrist kann der nächste öffentliche Abruf erneut prüfen.
- Das letzte erfolgreiche Release-Ergebnis bleibt bei temporären GitHub-Fehlern erhalten.

### Geändert

- Persistenter Update-Cache mit ETag-Revalidierung, gemeinsamen parallelen Prüfungen und Hintergrundaktualisierung.
- GitHub-Wartefristen und eine persistente Mindestpause begrenzen automatische und manuelle Anfragen.
- Portal und Adminbereich zeigen laufende Hintergrundprüfungen und fehlgeschlagene Aktualisierungen an; der Admin-Prüfbutton berücksichtigt die Wartefrist.
- Docker Compose lädt zusätzliche Einstellungen direkt aus einer optionalen .env-Datei.
- Regressionstests für Cache-Wiederherstellung, Wiederholungen und begrenzte Statusabfragen ergänzt.
