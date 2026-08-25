# ToDo

## LXC und Updates

- [ ] Authentifizierung für den Administrationsbereich einführen.

- [x] Admin-Logmodul für whitelisted LXC-/Docker-Logs mit Anzeige und Download ergänzen. (v1.1.6 geplant)
- [x] Logs manuell als `.gz` archivieren und neue leere Logs anlegen. (v1.1.6 geplant)
- [x] Log-Rotation nach Tag, Woche, Monat und Jahr konfigurierbar machen. (v1.1.6 geplant)
- [x] Feste Archivanzahl je Logtyp konfigurieren und alte Logs/`.gz`-Archive automatisch löschen. (v1.1.6 geplant)
- [ ] Admin-Authentifizierung vor produktiver Nutzung des Logmoduls einführen.

## App-Icon-System 1.1.0

- [x] App-Modell um einen lokalen Icon-Schlüssel erweitern. (v1.1.0)
- [x] Automatische Erkennung und manuelle Icon-Auswahl im Admin ergänzen. (v1.1.0)
- [x] Lokalen Icon-Katalog für häufige Homelab-Apps ergänzen. (v1.1.0)
- [x] Eigene Icon-URL als Fallback beibehalten und Icons in App-Karten zentral auflösen. (v1.1.0)

## Bereits umgesetzt

- [x] GitHub-README, Beitragsrichtlinien, Security-Hinweise, Issue-Templates und CI ergänzt.
- [x] Konfigurierbares Grafana-Dashboard per Iframe implementiert. (v0.1.0)
- [x] Grafana-URL, Dashboard-UID/Slug, Zeitraum und Refresh in den Admin-Einstellungen ergänzt. (v0.1.0)
- [x] Grafana-Eingabefokus korrigiert: Änderungen werden gesammelt und per Speichern-Button übertragen. (v0.1.0)
- [x] LXC-Container auf Proxmox mit Debian 13 erstellen.
- [x] Node.js LTS, Git und benötigte Systempakete installieren.
- [x] HomeLab-Portal unter `/opt/homelab-portal` installieren und produktiv bauen.
- [x] `systemd`-Service `homelab-portal.service` einrichten und Start beim Boot aktivieren.
- [x] Zugriff über Reverse Proxy und HTTPS einrichten.
- [x] Update-Script mit Backup, Lock, Build und Healthcheck implementieren.
- [x] Serverroute für den Update-Status und das geschützte Update-Script implementieren.
- [x] WebUI um "Nach Update suchen" und "Update installieren" erweitern.
- [x] Fehlerstatus und Rollback auf die letzte funktionierende Version anzeigen.
- [x] Updatefunktion im LXC testen: alte Version, neue Version, Buildfehler, Neustart und Wiederherstellung der Konfiguration.
- [x] Updatebetrieb dokumentieren und nur feste Quellen wie `origin/main` zulassen.

## GitHub Workflows Fehler beheben
- [x] ci.yml -> grep -q '^## \[Unreleased\]' CHANGELOG.md schlug fehl, da der Abschnitt fehlte. `## [Unreleased]` in CHANGELOG.md ergänzt. (v1.1.8)
- [x] release.yml -> gh release create schlug fehl, wenn Tag bereits existiert. Prüfung mit `gh release view` ergänzt, Erstellung wird bei bestehendem Release übersprungen. (v1.1.8)

## Dringende Änderungen
- [x] Docker wird momentan mit Node 20 erstellt! Update auf Node 26 LTS durchführen, da Node 20 nicht mehr unterstützt wird. (v1.1.8)
- [x] Prüfe alle verwendeten Programmiersprachen/Techniken/Bibliotheken auf Sicherheitslücken und aktualisiere sie auf die neuesten Versionen. `npm audit` meldet 0 Lücken; express, zod, typescript, @types/express, @types/node, lucide-react, oxlint, @types/react-dom und concurrently auf neueste Version aktualisiert. (v1.1.8)
- [x] Prüfe die Kompatibilität der App mit Node 26 LTS und behebe eventuelle Probleme. Build und Lint laufen fehlerfrei, Server startet erfolgreich unter Node 26. (v1.1.8)
- [x] LXC-Installation und automatische Updates auf den aktuellen Node.js-LTS-Stand aktualisieren. (v1.1.9)
- [x] LXC-Installation und automatische Updates ausdrücklich auf Node.js 26 umstellen. (v1.1.10)