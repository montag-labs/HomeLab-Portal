# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [1.5.13] - 2026-09-05

### Behoben

- Die aktuelle Laufzeitkonfiguration wird bei LXC-Updates vor und nach dem Stoppen des Dienstes gesichert.
- Versionierte alte Konfigurationen können keine Links oder Icon-Zuordnungen mehr wiederherstellen.

## [1.5.12] - 2026-09-05

### Hinzugefügt

- Bei fehlgeschlagenen LXC-Updates wird ein kopierbarer Befehl für das manuelle Update angezeigt.

## [1.5.11] - 2026-09-05

### Behoben

- LXC-Updates wiederholen vorübergehende Netzwerk- und npm-Fehler automatisch.
- Fehlgeschlagene Updates protokollieren jetzt das fehlerhafte Kommando und zusätzliche systemd-Diagnosen.

## [1.5.10] - 2026-09-05

### Behoben

- Icons werden nur beim Anlegen oder Bearbeiten eines Links automatisch erkannt und danach dauerhaft gespeichert.
- Die automatische Icon-Erkennung verwendet normalisierte Dienstnamen, bevor generische Domain-Aliase geprüft werden.

## [1.5.9] - 2026-09-05

### Behoben

- Fehlgeschlagene Updateprüfungen blockieren nach einem alten Fortschrittsstatus keine erneute manuelle Prüfung mehr.
- Veraltete Fortschrittsdateien werden entfernt, wenn die Installation bereits aktuell ist.

## [1.5.8] - 2026-09-04

### Behoben

- LXC-Updates verlieren beim Installieren der staging-Abhängigkeiten nicht mehr ihr aktuelles Arbeitsverzeichnis.

## [1.5.7] - 2026-09-04

### Hinzugefügt

- Fünf weitere Icons aus der Dashboard-Icons-Datenbank ergänzt.
- Die Icon-Auswahl im Adminbereich alphabetisch nach Label sortiert.

## [1.5.6] - 2026-09-03

### Behoben

- Der Update-Fortschritt bleibt beim Stoppen des Portal-Dienstes verfügbar und verursacht keine fehlenden RuntimeDirectory-Fehler mehr.

## [1.5.5] - 2026-09-03

### Hinzugefügt

- Rote Update-Fehler-Popups mit Fehlercode und grünes Erfolgs-Popup nach dem Reload.
- Update-Meldungen können per `X` sofort geschlossen werden.

### Behoben

- Fehlgeschlagene Update-Skripte werden über die API korrekt als fehlgeschlagen erkannt.

## [1.5.4] - 2026-09-03

### Hinzugefügt

- Selbstaktualisierender Bootstrap-Wrapper und GitHub-Tarball-Fallback für LXC-Updates.

### Behoben

- Updates funktionieren auch dann weiter, wenn die lokale Installation keine nutzbare Git-Arbeitskopie mehr enthält.

## [1.5.3] - 2026-09-03

### Hinzugefügt

- Echter Update-Fortschritt aus dem LXC-Update-Skript wird im Adminbereich angezeigt.

### Behoben

- LXC-Updates lösen die systemd-Dateiüberwachung zuverlässig aus und behalten die Git-Metadaten für Folgeupdates.

## [1.5.2] - 2026-09-03

### Geändert

- Unreferenzierte Branding-Komponente und die redundante LXC-Weiterleitungsdatei im Projektstamm entfernt.
- LXC-Dokumentation beschreibt den Staging-Build und atomaren Updatewechsel vollständig.

## [1.5.1] - 2026-09-03

### Behoben

- Der zuletzt erfolgreiche Erreichbarkeitsstatus bleibt beim erneuten Laden der Portalseite erhalten und wird unverzüglich im Hintergrund aktualisiert.
- Vorübergehende Fehler des Statusendpunkts behalten den letzten gültigen Snapshot bei; fehlgeschlagene Dienstprüfungen werden einmal wiederholt.

## [1.5.0] - 2026-09-03

### Hinzugefügt

- Automatisierte Server- und Clienttests für Konfigurationsvalidierung, Migrationen sowie öffentliche und administrative Zugriffsgrenzen.

### Geändert

- Sitzungs- sowie Login- und Status-Limits bereinigen abgelaufene Einträge periodisch und begrenzen ihre Speichergröße.
- Kategorien und Apps speichern Reihenfolgeänderungen jeweils in einer atomaren Batch-Mutation.
- Die CI nutzt alle Lockfiles für den npm-Cache und installiert keine Root-Abhängigkeiten mehr.
- LXC-Updates werden vor dem kurzen Dienstneustart in einem Staging-Verzeichnis gebaut und anschließend atomar umgeschaltet.

## [1.4.3] - 2026-09-03

### Geändert

- Erreichbarkeitsprüfungen werden im Portal gebündelt, serverseitig kurzzeitig zwischengespeichert und mit begrenzter Parallelität ausgeführt.
- Statische Assets werden komprimiert ausgeliefert; versionierte Bundles erhalten langfristige Cache-Header.
- Der Admin-Bereich einschließlich Sitzungsprüfung wird erst beim Öffnen der Adminroute geladen.
- Das übergroße Brandingbild wurde durch die bereits optimierte Logo-Datei ersetzt.
- Client- und Server-Abhängigkeiten wurden auf aktuelle Patch- und Minor-Versionen aktualisiert.

## [1.4.2] - 2026-09-03

### Geändert

- Datums- und Zeitangaben im Admin-Bereich verwenden einheitlich zweistellige Tage und Monate.

### Behoben

- Docker Compose initialisiert die Rechte des persistenten Datenverzeichnisses automatisch, sodass die Portal-Konfiguration beim ersten Start zuverlässig geladen und gespeichert werden kann.
- Docker-Logs verwenden denselben persistenten Daten-Mount ohne überlappenden zweiten Bind-Mount.

## [1.4.1] - 2026-08-29

### Geändert

- Das OpenID-Connect-Modul ist im Admin-Menü nun direkt hinter „Allgemein“ einsortiert.

## [1.4.0] - 2026-08-29

### Geändert

- Das Portal-Logo wurde für eine deutlich kleinere Dateigröße optimiert und als Browser-Favicon eingebunden.

## [1.3.18] - 2026-08-29

### Hinzugefügt

- Eigenes Admin-Modul zum Konfigurieren, Speichern und Testen von OpenID Connect ergänzt.

### Sicherheit

- Client-Secrets werden separat mit restriktiven Rechten gespeichert, nie zurückgegeben oder exportiert; das Abschalten des Passwort-Fallbacks erfordert zuvor eine erfolgreiche SSO-Testanmeldung.

## [1.3.17] - 2026-08-29

### Hinzugefügt

- Optionales OpenID-Connect-SSO für den Admin-Bereich mit PKCE, State-/Nonce-Prüfung, konfigurierbarer Anbieterbeschriftung und lokalem Passwort-Fallback.

### Sicherheit

- SSO wird nur mit einer expliziten Admin-Gruppenfreigabe aktiviert; Gruppen-Claims werden serverseitig geprüft und OIDC-Tokens nicht an den Browser ausgegeben.
- Offene OIDC-Anmeldevorgänge sind zeitlich und mengenmäßig begrenzt.

### Behoben

- Einen Syntaxfehler im LXC-Installationsscript entfernt, damit Parameterdateien einschließlich der neuen OIDC-Werte wieder verarbeitet werden.

## [1.3.16] - 2026-08-29

### Behoben

- Der Sicherheitsindikator für die geschützte Administration wird vertrauenswürdig grün statt orange dargestellt.

## [1.3.15] - 2026-08-29

### Behoben

- Akzentfarben werden bei der Auswahl sofort übernommen und als gezielte Einstellungsänderung zuverlässig gespeichert.
- Konfigurationsexporte lesen vor dem Download den aktuellen Serverstand; Import und Export sind während laufender Übertragungen gegen parallele Änderungen geschützt.

## [1.3.14] - 2026-08-28

### Geändert

- Dashboard-Modul als Dashboard-Hub mit Aktivierung, Anbieter-Presets, kompakter Konfiguration, Live-Vorschau und neuer Portal-Toolbar vollständig neu gestaltet.
- Neben Grafana werden Netdata, veröffentlichte Uptime-Kuma-Statusseiten und frei konfigurierbare Dashboard-URLs unterstützt; bestehende Grafana-Konfigurationen werden automatisch migriert.
- Log-Rotationsleiste verkleinert und Felder sowie Speicheraktion auf Desktop in einer Zeile angeordnet.

## [1.3.13] - 2026-08-28

### Geändert

- Log-Modul mit Quellen-Navigation, konsolidierter Log-Anzeige, Schnellaktionen und übersichtlicher Archivverwaltung neu gestaltet.
- LXC- und Docker-spezifische Logquellen werden nur noch im jeweils passenden Betriebsmodus angezeigt und sind im anderen Modus auch nicht über die Log-API erreichbar.

### Behoben

- LXC-Neuinstallationen verwenden ohne Rückfrage Port 80; ein abweichender Port kann mit `--port PORT` festgelegt werden.

## [1.3.12] - 2026-08-28

### Behoben

- LXC-Installation zeigt Fortschritt und Fehler wieder direkt im Terminal und schreibt sie weiterhin ins Installationslog.
- Fehlgeschlagene LXC-Service-Starts und Healthchecks geben automatisch systemd-Status und Journal-Auszug aus.

## [1.3.11] - 2026-08-28

### Geändert

- Portal, Admin-Anmeldung und Administrationsbereich verwenden dieselbe Logo-Grafik und gemeinsame Branding-Komponente.
- Admin-Header entfernt und die Inhaltsfläche entsprechend vereinfacht.
- Wirkungslosen Theme-Wähler aus den allgemeinen Admin-Einstellungen entfernt; die Darstellung wird weiterhin direkt im Portal umgeschaltet.
- README auf allgemeine Informationen und Docker-/LXC-Schnellstarts reduziert; Detaildokumentation, Sicherheitsangaben und Beitragsrichtlinien vollständig aktualisiert.

## [1.3.10] - 2026-08-28

### Behoben

- Hell-/Dunkel-Umschaltung im öffentlichen Portal funktioniert ohne Admin-Anmeldung und wird lokal im Browser gespeichert.
- Grafana-Dashboards folgen der lokal ausgewählten Darstellung.

## [1.3.9] - 2026-08-28

### Geändert

- Grafana-Dashboards erhalten automatisch das aktive helle oder dunkle Portal-Theme.

## [1.3.8] - 2026-08-28

### Behoben

- Öffentliche Portalnavigation folgt jetzt zuverlässig der Hell-/Dunkel-Theme-Auswahl.

## [1.3.7] - 2026-08-28

### Geändert

- Theme-Umschalter in den öffentlichen Portal-Header neben Kategorien und Dienste verschoben.

## [1.3.6] - 2026-08-28

### Behoben

- Theme-Auswahl auf Portal und Administration angewendet.
- Umschalten zwischen hellem und dunklem Theme als Kachel im Admin-Header ergänzt.

## [1.3.5] - 2026-08-28

### Behoben

- Innenabstände der Admin-Kacheln wiederhergestellt; 5px bleiben auf äußere Ränder und Kachelabstände beschränkt.

## [1.3.4] - 2026-08-28

### Geändert

- Öffentliches Header-Logo durch die bereitgestellte PNG-Bildmarke ersetzt.

## [1.3.3] - 2026-08-28

### Geändert

- Logo im öffentlichen Portal-Header als Kachel im Stil der Kategorien- und Dienste-Zähler gestaltet.
- Abstände zwischen Kacheln, Bereichen und Navigation im Adminbereich auf 5px verdichtet.

## [1.3.2] - 2026-08-28

### Geändert

- Grafana-Dashboard nutzt im öffentlichen Portal die gesamte Fläche direkt unterhalb des Headers.

## [1.3.1] - 2026-08-28

### Geändert

- Öffentlichen Portal-Header verdichtet: Logo und Versionsstatus befinden sich links, die Zähler für Kategorien und Dienste oben rechts.
- Einleitungstext aus der Portalübersicht entfernt und die Sidebar-Navigation weiter nach oben verschoben.

## [1.3.0] - 2026-08-28

### Hinzugefügt

- Öffentliche Portalansicht mit einheitlichem Design, Übersichtsheader und Zählern für Kategorien und Dienste erweitert.

### Geändert

- Navigation, Kategorien, App-Karten, Grafana-Fläche und Spendenlinks responsiv an das Design des Adminbereichs angepasst.
- LXC-Updates werden jetzt ausschließlich über die geschützte Admin-Sitzung und den sitzungsgebundenen CSRF-Token autorisiert.
- Veraltete Update-Token-Eingabe, Einmal-Popup, API-Routen, Token-Dateien und Reset-Hilfsscript entfernt.
- LXC-Upgrades bereinigen vorhandene Update-Token-Artefakte automatisch.

## [1.2.1] - 2026-08-28

### Behoben

- Kategorien im öffentlichen Portal lassen sich wieder zuverlässig auf- und zuklappen. Der persönliche Zustand wird lokal im Browser gespeichert, ohne eine geschützte Admin-API aufzurufen.

## [1.2.0] - 2026-08-28

### Hinzugefügt

- Admin-Authentifizierung mit serverseitigen Sitzungen, geschützten Cookies, CSRF-Schutz und begrenzten Loginversuchen eingeführt.
- Admin-Passwort kann jetzt über die Weboberfläche geändert und für Node.js, Docker und LXC persistent gespeichert werden.
- Neue responsive Anmeldemaske und ein einheitlich gestalteter Administrationsbereich mit Navigation, Statusanzeige und überarbeiteten Formularen ergänzt.

### Geändert

- Docker-Container läuft als unprivilegierter Benutzer mit schreibgeschütztem Root-Dateisystem, entfernten Capabilities und `no-new-privileges`.
- LXC-Service läuft als eigener Systembenutzer mit systemd-Sandboxing und festem systemd-Path-Trigger für privilegierte Updates.
- React-Contexts und abgeleitete UI-Zustände neu strukturiert; Frontend-Lint läuft ohne Warnungen.
- Dokumentation für Authentifizierung, Passwortverwaltung sowie Docker- und LXC-Härtung aktualisiert.

### Sicherheit

- Konfigurations-, Log-, Diagnose-, Update-Token- und mutierende API-Endpunkte durch Admin-Authentifizierung geschützt.
- Statusprüfung auf konfigurierte HTTP(S)-Ziele begrenzt und gegen frei nutzbare SSRF-Anfragen abgesichert.
- TLS-Zertifikatsprüfung standardmäßig aktiviert; unsichere Homelab-Zertifikate erfordern ein explizites Opt-in.
- Sicherheitsheader, Content Security Policy, Request-Größenlimit und zentrale API-Fehlerbehandlung ergänzt.
- Konfigurationszugriffe vollständig serialisiert, validiert und auf atomare Schreibvorgänge umgestellt.

## [1.1.12] - 2026-08-26

### Behoben

- React-19-/TypeScript-7-Kompatibilitätswarnungen bei Log-Effekten und der Kategorieauswahl behoben.

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

[unreleased]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.3.18...v1.4.0
[1.3.18]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.3.17...v1.3.18
[1.3.17]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.3.16...v1.3.17
[1.3.16]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.3.15...v1.3.16
[1.3.15]: https://github.com/montag-labs/HomeLab-Portal/compare/v1.3.14...v1.3.15
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
