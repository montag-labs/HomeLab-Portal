# Sicherheit

## Aktueller Sicherheitsstatus

HomeLab-Portal besitzt derzeit keine eigene Authentifizierung und ist für den Betrieb in einem vertrauenswürdigen Heimnetz vorgesehen.

- Port 4000 nicht direkt ins Internet exponieren.
- Einen Reverse Proxy mit HTTPS und Authentifizierung verwenden, wenn Zugriff außerhalb des Heimnetzes erforderlich ist.
- `server/data/config.json` enthält lokale Infrastruktur-URLs und darf nicht veröffentlicht werden.
- Grafana-Zugangsdaten niemals in Portal-Konfiguration, URL, Issue oder Pull Request speichern.

## Sicherheitsluecke melden

Bitte melde Sicherheitsprobleme nicht öffentlich über GitHub Issues. Erstelle stattdessen einen privaten Security-Report im GitHub-Repository. Falls diese Funktion nicht aktiviert ist, kontaktiere die Maintainer direkt über das Repository-Profil.

Bitte beschreibe:

- betroffene Version oder Commit-ID
- reproduzierbare Schritte
- erwartetes und tatsaechliches Verhalten
- mögliche Auswirkungen
- vorhandene Gegenmassnahmen

Bitte keine produktiven IP-Adressen, Passwoerter, Tokens oder Screenshots mit vertraulichen Daten mitsenden.
