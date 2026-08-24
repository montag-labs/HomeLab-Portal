# ToDo

## LXC und Updates

- [ ] LXC-Container auf Proxmox mit Debian 13 erstellen.
- [ ] Node.js LTS, Git und benötigte Systempakete installieren.
- [ ] HomeLab-Portal unter `/opt/homelab-portal` installieren und produktiv bauen.
- [ ] `systemd`-Service `homelab-portal.service` einrichten und Start beim Boot aktivieren.
- [ ] Zugriff über Reverse Proxy und HTTPS einrichten.
- [ ] Authentifizierung für den Administrationsbereich einführen.
- [ ] Update-Script mit Backup, Lock, Build und Healthcheck implementieren.
- [ ] Serverroute für den Update-Status und das geschützte Update-Script implementieren.
- [ ] WebUI um "Nach Update suchen" und "Update installieren" erweitern.
- [ ] Fehlerstatus und Rollback auf die letzte funktionierende Version anzeigen.
- [ ] Updatefunktion im LXC testen: alte Version, neue Version, Buildfehler, Neustart und Wiederherstellung der Konfiguration.
- [ ] Updatebetrieb dokumentieren und nur feste Quellen wie `origin/main` zulassen.

## Bereits umgesetzt

- [x] GitHub-README, Beitragsrichtlinien, Security-Hinweise, Issue-Templates und CI ergänzt.
- [x] Konfigurierbares Grafana-Dashboard per Iframe implementiert. (v0.1.0)
- [x] Grafana-URL, Dashboard-UID/Slug, Zeitraum und Refresh in den Admin-Einstellungen ergänzt. (v0.1.0)
- [x] Grafana-Eingabefokus korrigiert: Änderungen werden gesammelt und per Speichern-Button übertragen. (v0.1.0)
