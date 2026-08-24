# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

Noch keine Änderungen.

## [0.1.11] - 2026-08-24

### Geändert

- npm-Installationsskripte werden kontrolliert ausgeführt, damit die `allow-scripts`-Warnung nicht mehr erscheint.
- Healthcheck wartet länger und gibt bei Erfolg die ermittelte LXC-IP aus.
- Installations- und Updateausgaben wurden verständlicher gestaltet.
- Mit `--switch PORT` kann der Port einer bestehenden LXC-Installation geändert werden.

## [0.1.10] - 2026-08-24

### Geändert

- Portauslesen aus bestehender systemd-Installation gegen Leerzeichen und Zeilenenden abgesichert.
- Fehlermeldung bei ungültigem Port für Installationen und Updates präzisiert.

## [0.1.9] - 2026-08-24

### Hinzugefügt

- Klare Portabfrage mit vorausgefülltem Standardwert `80` ergänzt.

### Geändert

- Bestehende Installationen behalten automatisch ihren bisherigen Port.
- npm-Hinweise auf neue npm-Hauptversionen während der Installation unterdrückt.

## [0.1.8] - 2026-08-24

### Hinzugefügt

- Installationsscript erkennt bestehende Installationen und unterstützt Updates.

### Geändert

- Updatepfad prüft Versionen, sichert die Konfiguration und versucht bei Fehlern ein Rollback.
- Der Healthcheck verwendet den konfigurierten LXC-Port.

## [0.1.7] - 2026-08-24

### Hinzugefügt

- Konfigurierbarer LXC-Port mit Standardwert `80` ergänzt.
- Installationsscript erkennt bestehende Installationen und unterstützt Updates.

### Geändert

- Lokale Entwicklung verwendet weiterhin Port `4000`, während der Produktionsstandard auf Port `80` liegt.
- LXC-Dokumentation verwendet die dynamische Adresse des LXC statt eines Container-Platzhalters.
- Updatepfad sichert die Konfiguration und versucht bei Fehlern ein Rollback.

## [0.1.6] - 2026-08-24

### Hinzugefügt

- Direkt ausführbares LXC-Installationsscript aus dem HomeLab-Portal-Repository.
- Automatische Einrichtung des systemd-Service und abschließender Healthcheck.

### Dokumentation

- Einzeiliger Installationsaufruf für LXC in README und LXC-Anleitung ergänzt.

## [0.1.5] - 2026-08-24

### Hinzugefügt

- Update-Modul zur Prüfung stabiler GitHub-Releases.
- Admin-Anzeige für installierte und verfügbare Version sowie Docker-/LXC-Modus.

### Geändert

- Docker-Updates als sichere hostseitige Aktualisierung dokumentiert.
- LXC-Updatepfad und Anforderungen für die spätere Authentifizierung dokumentiert.

## [0.1.4] - 2026-08-24

### Hinzugefügt

- Eigenes HomeLab-Portal-Logo für Sidebar und Browser-Favicon ergänzt.

### Geändert

- Logo-Farben passen sich im Portal automatisch an das aktive Theme an.

## [0.1.3] - 2026-08-24

### Geändert

- Deutsche Texte in Dokumentation und GitHub-Vorlagen mit korrekten Umlauten ergänzt.

## [0.1.2] - 2026-08-24

### Geändert

- Deutsche Projektbeschreibung mit Umlauten und englische Kurzbeschreibung ergänzt.
- Private Beispiel-IP-Adressen in der Konfigurationsvorlage durch Dokumentationsadressen ersetzt.
- LXC-Dokumentation auf Debian 13 aktualisiert.

## [0.1.1] - 2026-08-24

### Hinzugefügt

- Grafana-Einstellungen in ein eigenes Dashboard-Modul verschoben.
- Lucide-Icon für das Öffnen des Grafana-Dashboards ergänzt.
- CI-Prüfung für die Pflege der Änderungshistorie ergänzt.

### Geändert

- Button zum Öffnen von Grafana als schwebendes Icon oben links im Iframe gestaltet.
- Projektstruktur um ungenutzte Vite-Template-Assets bereinigt.

## [0.1.0] - 2026-08-24

### Hinzugefügt

- Webportal für Homelab-Dienste mit Kategorien und Apps.
- Erreichbarkeitsstatus für konfigurierte Dienste.
- Helles und dunkles Theme sowie deutsche und englische Sprache.
- Import und Export der Portal-Konfiguration.
- Optionales Grafana-Dashboard per Iframe.
- Betrieb mit Node.js oder Docker Compose.
- Dokumentation für Installation, LXC-Betrieb und Sicherheit.

[unreleased]: https://github.com/montag-labs/HomeLab-Portal/compare/v0.1.11...HEAD
[0.1.11]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.11
[0.1.10]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.10
[0.1.9]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.9
[0.1.8]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.8
[0.1.7]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.7
[0.1.6]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.6
[0.1.5]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.5
[0.1.4]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.4
[0.1.3]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.3
[0.1.2]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.2
[0.1.1]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.1
[0.1.0]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.0
