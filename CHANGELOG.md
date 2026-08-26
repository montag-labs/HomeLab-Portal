# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [1.1.11] - 2026-08-26

### Behoben

- Kategorien reagieren beim Ein-/Ausklappen wieder sofort und behandeln laufende oder fehlgeschlagene Speichervorgänge korrekt.

## [1.1.10] - 2026-08-25

### Geändert

- LXC-Installation und automatische Updates verwenden jetzt ausdrücklich Node.js 26 statt der generischen aktuellen LTS-Version.

## [1.1.9] - 2026-08-25

### Geändert

- LXC-Installation und automatische Updates aktualisieren Node.js und npm jetzt auf den aktuellen LTS-Stand.
- LXC-Updates verwenden die aktuelle NodeSource-LTS-Quelle und aktivieren reproduzierbare Dependency-Installationen.

## [1.1.8] - 2026-08-25

### Geändert

- Docker-Images und CI-Workflow von Node 20 auf Node 26 aktualisiert.
- Abhängigkeiten aktualisiert: express 5, zod 4, typescript 7, @types/express 5, @types/node 26, lucide-react, oxlint, @types/react-dom, concurrently 10.
- CI-Workflow prüft jetzt korrekt den `## [Unreleased]`-Abschnitt im Changelog.
- Release-Workflow überspringt die Release-Erstellung, wenn der Tag bereits existiert.

## [1.1.7] - 2026-08-25

### Behoben

- Der Updatepfad des LXC-Installationsscripts schreibt jetzt in das separate Update-Log.

## [1.1.6] - 2026-08-25

### Hinzugefügt

- Admin-Logmodul mit Anzeige, Download, `.gz`-Archivierung und leeren neuen Logs ergänzt.
- Log-Rotation nach Tag, Woche, Monat und Jahr sowie konfigurierbare Archivaufbewahrung ergänzt.
- LXC-Installationslog, Docker-Update-Log und tägliche LXC-Rotationsprüfung ergänzt.

## [1.1.5] - 2026-08-25

### Behoben

- Icon-Auswahl im Formular „Neue App“ vor dem Hintergrundstyling des Hinzufügen-Buttons geschützt.

## [1.1.4] - 2026-08-25

### Geändert

- Hintergrundflächen im Admin-Icon-Picker und in den Icon-Auswahlkacheln entfernt.

## [1.1.3] - 2026-08-25

### Geändert

- Icon-Hintergründe in App-Karten und Icon-Vorschauen auf transparent umgestellt.

## [1.1.2] - 2026-08-25

### Geändert

- Enthaltene App-Icons aus dem Dashboard-Icons-Katalog neu geladen und aktualisiert.
- Zusätzliche Katalog-Icons für weitere Homelab-Dienste aufgenommen.

## [1.1.1] - 2026-08-25

### Geändert

- Icon-Auswahl im Administrationsbereich durch eine durchsuchbare Ergebnisliste ersetzt.

## [1.1.0] - 2026-08-25

### Hinzugefügt

- Lokaler Icon-Katalog für häufige Homelab-Anwendungen ergänzt.
- Automatische Icon-Erkennung anhand von App-Name und Adresse ergänzt.
- Manuelle Icon-Auswahl und bestehende eigene Icon-URL im Administrationsbereich beibehalten.
- Icon-Schlüssel in Konfiguration und API ergänzt; bestehende Konfigurationen bleiben kompatibel.

## [1.0.0] - 2026-08-25

### Hinzugefügt

- Erstes produktives Release von HomeLab-Portal.
- Stabile Web-Oberfläche für Homelab-Dienste, Kategorien, Erreichbarkeitsstatus und eingebettetes Grafana-Dashboard.
- Docker- und LXC-Betriebsmodelle mit Updates und Konfigurationspfaden für Produktivumgebungen.

### Geändert

- Produktive Versionierung auf 1.0.0 gesetzt.
- Release-Workflow und Docker-Setup auf stabiles erstes Produktiv-Release vorbereitet.

## [0.1.35] - 2026-08-24

### Behoben

- Pfad zur eingebetteten Docker-Konfigurationsvorlage korrigiert.
- Docker verwendet den Fallback korrekt, wenn der Daten-Volume-Mount keine Vorlage enthält.

## [0.1.34] - 2026-08-24

### Behoben

- Docker-Update erzwingt den Pull und die Neuerstellung des Portal-Containers.
- Fehlgeschlagene Config-Ladevorgänge zeigen im Docker-Admin eine verständliche Fehlermeldung.
- Docker verwendet eine eingebettete Konfigurationsvorlage, wenn das gemountete Datenverzeichnis leer ist.
- Docker-Compose verwendet im Produktivbetrieb eindeutig das aktuelle Docker-Hub-Image statt eines lokalen Builds.
- Docker-Healthcheck prüft die Config-API des laufenden Containers.

## [0.1.33] - 2026-08-24

### Behoben

- Fehlgeschlagene Config-Ladevorgänge zeigen im Docker-Admin eine verständliche Fehlermeldung.

## [0.1.32] - 2026-08-24

### Geändert

- Docker-Update erzwingt den Pull und die Neuerstellung des Portal-Containers.

## [0.1.31] - 2026-08-24

### Hinzugefügt

- Docker-Hub-Workflow für automatische Multi-Architektur-Releases ergänzt.
- Öffentlicher Docker-Workflow für `montaglabs/homelab-portal` ergänzt.

### Geändert

- Docker-Publishing wird ausschließlich durch Versions-Tags ausgelöst und erzeugt signierte Build-Metadaten.
- Docker-Compose und Docker-Update auf das veröffentlichte Image umgestellt.

## [0.1.30] - 2026-08-24

### Geändert

- README-Spendenbuttons auf 20 Prozent skaliert und beide Links öffnen in einem neuen Tab.

## [0.1.29] - 2026-08-24

### Hinzugefügt

- PayPal-Spendenbutton unterhalb von Ko-fi ergänzt.
- Ko-fi-Support-Link „Support my Project“ oben in der README ergänzt.
- PayPal-Spendenbutton oben in der README ergänzt.
- Docker-Betriebsmodus mit hostseitigem Update-Script ergänzt.

## [0.1.28] - 2026-08-24

### Geändert

- Abstand zwischen HomeLab-Portal und Versionsanzeige im Logo reduziert.

## [0.1.27] - 2026-08-24

### Geändert

- Versionsanzeige unter dem Logo verwendet jetzt das Format `vX.Y.Z`.

## [0.1.26] - 2026-08-24

### Geändert

- Autorentext aus dem Logo entfernt und den Footer-Link auf das GitHub-Repository gesetzt.

## [0.1.25] - 2026-08-24

### Behoben

- Ko-fi-Widget durch einen sicheren Link ersetzt, damit die Anwendung beim Laden nicht überschrieben wird.

## [0.1.24] - 2026-08-24

### Hinzugefügt

- GitHub-Release-Workflow verwendet den Versions-Tag als alleinigen Release-Namen.
- Logo zeigt den Repository-Link „by Marc Montag“ unterhalb der Wortmarke.
- Ko-fi-Unterstützung und Lizenzhinweis links unten in der Sidebar ergänzt.

## [0.1.23] - 2026-08-24

### Geändert

- Parameterdatei um Beschreibungen, erlaubte Eingaben und Defaults ergänzt.

### Behoben

- Online-Status berücksichtigt Domain und lokale IP parallel, wenn beide hinterlegt sind.

## [0.1.22] - 2026-08-24

### Geändert

- Laufzeitkonfiguration auf den Namen `lxc.config` umgestellt.
- Bestehende `install.conf`-Dateien werden beim nächsten Scriptlauf migriert.

## [0.1.21] - 2026-08-24

### Hinzugefügt

- Kommentierbare Parameterdatei für Installation und Update ergänzt.
- Produktiv-/DEV-Schalter über `APP_ENV` ergänzt.
- Eigenes DEV-Diagnosemodul im Adminbereich ergänzt.

### Geändert

- Repository-URL und Tokenpfade sind feste interne Werte und nicht mehr konfigurierbar.
- DEV-Debug-API liefert detaillierte Erreichbarkeitsdiagnosen.

## [0.1.20] - 2026-08-24

### Hinzugefügt

- DEV-Debug-API unter `GET /api/dev/debug` mit Laufzeit-, Konfigurations- und Erreichbarkeitsdiagnosen.

### Geändert

- Debug-API wird bei `NODE_ENV=production` nicht registriert.
- Erreichbarkeitsprüfung liefert Methode, HTTP-Status und Fehlerursache für die Diagnose.

## [0.1.19] - 2026-08-24

### Behoben

- Update-Script legt das Logverzeichnis vor der ersten Ausgabe zuverlässig an.
- LXC-Update läuft in einem eigenen systemd-Unit und wird beim Stoppen des Portal-Service nicht mehr beendet.
- Update-Script stellt den Portal-Service auch nach einem unerwarteten Abbruch wieder her.

## [0.1.18] - 2026-08-24

### Behoben

- Erreichbarkeitsprüfung verwendet bei nicht unterstütztem HEAD-Aufruf automatisch GET.
- Timeout für die Erreichbarkeitsprüfung auf acht Sekunden erhöht.

## [0.1.17] - 2026-08-24

### Behoben

 - Update-Script legt das Logverzeichnis vor der ersten Ausgabe zuverlässig an.
- Erreichbarkeitsprüfung verwendet bei nicht unterstütztem HEAD-Aufruf automatisch GET.

## [0.1.16] - 2026-08-24

### Geändert

- Versionsnummer und Update-Status werden direkt unter HomeLab-Portal im Logo angezeigt.

## [0.1.15] - 2026-08-24

### Hinzugefügt

- Einmaliges Token-Popup beim ersten Öffnen der Anwendung.
- Terminal-Script zum Erzeugen eines neuen Update-Tokens.

### Geändert

- Update-Token wird sicher in einer geschützten Datei verwaltet.
- Updatebutton und Server-API verwenden den persistenten Token-Speicher.
- Update-Fehler aus der Server-API werden im Adminbereich verständlicher angezeigt.

## [0.1.14] - 2026-08-24

### Hinzugefügt

- Automatische Token-Erzeugung bei Installation und einmalige Anzeige beim ersten Öffnen.
- Terminal-Script zum Zurücksetzen des Update-Tokens ergänzt.
- Kleine Versionsanzeige mit Statusindikator unter dem HomeLab-Portal-Logo ergänzt.
- Anzeige markiert aktuelle Versionen, verfügbare Updates und fehlgeschlagene Prüfungen.

## [0.1.13] - 2026-08-24

### Hinzugefügt

- Geschützter UI-Start des LXC-Update-Scripts mit Update-Token.
- Status „Update läuft“ und automatisches Neuladen der Oberfläche nach dem Neustart.

### Geändert

- Das Installationsscript richtet das LXC-Update-Script automatisch ein.
- Fehlendes Update-Script wird vor dem Start sauber erkannt.

## [0.1.12] - 2026-08-24

### Geändert

- esbuild wird direkt über Node.js eingerichtet, damit auch die npm-Rebuild-Warnung entfällt.

## [0.1.11] - 2026-08-24

### Geändert

- npm-Installationsskripte werden kontrolliert ausgeführt, damit die `allow-scripts`-Warnung nicht mehr erscheint.
- esbuild wird direkt über Node.js eingerichtet, damit auch die npm-Rebuild-Warnung entfällt.
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
- Geschützter UI-Start des LXC-Update-Scripts mit Update-Token ergänzt.

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

[unreleased]: https://github.com/montag-labs/HomeLab-Portal/compare/v0.1.35...HEAD
[0.1.35]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.35
[0.1.34]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.34
[0.1.33]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.33
[0.1.32]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.32
[0.1.31]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.31
[0.1.30]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.30
[0.1.29]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.29
[0.1.28]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.28
[0.1.27]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.27
[0.1.26]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.26
[0.1.25]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.25
[0.1.24]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.24
[0.1.23]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.23
[0.1.22]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.22
[0.1.21]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.21
[0.1.20]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.20
[0.1.19]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.19
[0.1.18]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.18
[0.1.17]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.17
[0.1.16]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.16
[0.1.15]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.15
[0.1.14]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.14
[0.1.13]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.13
[0.1.12]: https://github.com/montag-labs/HomeLab-Portal/releases/tag/v0.1.12
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
