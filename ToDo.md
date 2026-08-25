# ToDo

## LXC und Updates

- [ ] Authentifizierung für den Administrationsbereich einführen.

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