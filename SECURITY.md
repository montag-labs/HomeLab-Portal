# Sicherheit

## Sicherheitsmodell

Das öffentliche Portal ist ohne Anmeldung erreichbar. Es zeigt die konfigurierten Kategorien, Dienste, URLs, Statusinformationen und gegebenenfalls das eingebettete Grafana-Dashboard. Diese Inhalte dürfen daher keine Geheimnisse enthalten.

Der Admin-Bereich und alle verändernden oder administrativen API-Routen sind geschützt durch:

- serverseitige Sitzungen mit acht Stunden Laufzeit
- `HttpOnly`- und `SameSite=Strict`-Session-Cookies
- `Secure`-Cookies bei HTTPS oder aktivem `FORCE_SECURE_COOKIES`
- CSRF-Token für schreibende Anfragen
- zeitkonstante Passwortvergleiche
- Begrenzung auf fünf Loginversuche pro IP innerhalb von 15 Minuten
- Mindestlänge von 12 Zeichen bei Passwortänderungen

Sitzungen werden nur im Arbeitsspeicher gehalten und gehen bei einem Serverneustart verloren.

## Empfehlungen für den Betrieb

- Portal und Admin-Bereich nicht ungeschützt aus dem Internet veröffentlichen.
- Einen vertrauenswürdigen Reverse Proxy mit HTTPS verwenden.
- `TRUST_PROXY=true` nur setzen, wenn das Backend ausschließlich über diesen Proxy erreichbar ist.
- Bei ausschließlichem HTTPS-Betrieb `FORCE_SECURE_COOKIES=true` setzen.
- Ein langes, zufälliges Admin-Passwort verwenden und die Passwortdatei sichern.
- `server/data/config.json` nicht veröffentlichen; sie kann interne Namen, IP-Adressen und URLs enthalten.
- Keine Grafana-Zugangsdaten in URLs oder Portal-Konfiguration speichern.
- `ALLOW_INSECURE_TLS=true` nur für kontrollierte Homelab-Ziele mit selbstsignierten Zertifikaten verwenden.
- `APP_ENV=development` nicht auf öffentlich erreichbaren Instanzen aktivieren.

Docker läuft ohne Root-Rechte, mit schreibgeschütztem Root-Dateisystem, entfernten Linux-Capabilities und `no-new-privileges`. Die LXC-Installation verwendet einen unprivilegierten Dienstbenutzer und systemd-Sandboxing. Updateaktionen sind auf feste Skripte und Quellen begrenzt.

Weitere Hinweise stehen in der [Betriebsdokumentation](docs/operations.md).

## Sicherheitslücke melden

Sicherheitsprobleme bitte nicht öffentlich über GitHub Issues melden. Stattdessen einen privaten Security-Report im GitHub-Repository erstellen. Falls diese Funktion nicht verfügbar ist, die Maintainer über das Repository-Profil kontaktieren.

Der Bericht sollte enthalten:

- betroffene Version oder Commit-ID
- reproduzierbare Schritte
- erwartetes und tatsächliches Verhalten
- mögliche Auswirkungen
- bereits getestete Gegenmaßnahmen

Keine produktiven IP-Adressen, Passwörter, Tokens, Konfigurationsdateien oder Screenshots mit vertraulichen Daten mitsenden.
