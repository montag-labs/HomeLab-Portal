# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Befehle

Node.js 26 + npm. Root, `client/` und `server/` haben jeweils ein eigenes `package-lock.json`.

```bash
npm run install:all                  # Abhängigkeiten für Server + Client installieren
export ADMIN_PASSWORD='<mind. 12 Zeichen>'  # PowerShell: $env:ADMIN_PASSWORD = "..."
npm run dev                          # Server (tsx watch, :4000) + Vite-Client (:5173, proxyt /api -> :4000)
npm run build                        # Client (tsc -b && vite build), danach Server (tsc -> server/dist)
npm start                            # node server/dist/index.js (liefert client/dist aus)

npm run lint --prefix client         # oxlint
npm test --prefix client             # vitest (jsdom)
npm test --prefix server             # vitest
npm run test:types --prefix server   # Typecheck der Server-Tests (läuft auch in der CI)

# Einzelner Test
cd client && npx vitest run src/iconCatalog.test.ts
cd server && npx vitest run test/auth.test.ts -t "<Testname>"
```

Die CI (`.github/workflows/ci.yml`) verlangt zusätzlich, dass `CHANGELOG.md` eine Überschrift `## [Unreleased]` und einen Eintrag `## [x.y.z]` enthält, und führt `npm audit --omit=dev --audit-level=high` aus.

## Architektur

Selbst gehostete Homelab-Startseite. Zwei unabhängige Pakete (keine Workspaces):

- `client/` – React-19-/Vite-SPA mit react-router, i18next und GridStack (Geräte-Dashboard).
- `server/` – Express 5 (ESM, TypeScript) mit Zod-4-Validierung. Im Produktivbetrieb liefert derselbe Express-Prozess `client/dist` aus (SPA-Fallback in `server/src/index.ts`); es gibt also nur einen Port (`HOMELAB_PORT`/`PORT`, Standard 80).

Server-Aufbau: `routes/` (dünne API-Router, alle in `index.ts` unter `/api` eingehängt) → `services/` (Logik, Dateipersistenz, OIDC, Update, Geräte-Scan) → `middleware/` (`auth.ts` enthält Session/CSRF/Login-Ratelimit und den Auth-Router; `security.ts` die Security-Header).

Wichtige Entwurfspunkte, die mehrere Dateien betreffen:

- **Persistenz erfolgt über JSON-Dateien in `server/data/`, keine Datenbank.** `config.json` wird beim ersten Lesen aus `config.default.json` erzeugt; Schreibzugriffe in `services/configStore.ts` laufen über eine Promise-Queue, die komplette Read-Modify-Write-Transaktionen serialisiert. Weitere Laufzeitdateien: `admin-password` (scrypt-Hash), `oidc.json`, `devices-dashboard.json`, `update-status.json` (alle git-ignoriert).
- **Das Konfigurationsschema steckt an mehreren Stellen, die gemeinsam geändert werden müssen:** Client-Typen, Server-`types.ts`, Zod-`schemas.ts`, `config.default.json` und `docs/`. Alte Formate werden in `normalizeConfig` migriert (z. B. `settings.grafana` -> `settings.dashboard`).
- **Grenze zwischen öffentlicher und Admin-API.** Das Portal ist öffentlich; `/admin` erfordert Session-Cookie (`homelab_admin_session`) plus CSRF-Token. Öffentliche Endpunkte liefern nur eine reduzierte Projektion von Konfiguration/Gerätedaten (keine Inventardetails, keine Secrets). Die Tests in `server/test/routes.test.ts` und `auth.test.ts` sichern diese Grenze ab – beim Hinzufügen von Routen müssen sie weiter bestehen.
- **Admin-Authentifizierung:** lokales Passwort (`ADMIN_PASSWORD` / `ADMIN_PASSWORD_FILE`, gehasht abgelegt) und optional OIDC (`services/oidcService.ts`, Authorization Code + PKCE, erfordert eine erlaubte Admin-Gruppe). Viele OIDC-/Update-/Log-Pfade sind per Umgebungsvariable konfigurierbar (siehe `process.env` in `server/src`).
- **Geräte-Dashboard** (`routes/devices.ts`, `services/deviceDashboard.ts`, `services/deviceScan.ts`, `services/scan/*`; Client: `client/src/devices/`): Netzwerk-/FRITZ!Box-Scan nur für Admins und begrenzt auf freigegebene private IPv4-Subnetze (`DEVICE_SCAN_SUBNETS`, Hersteller-Lookup über `DEVICE_VENDOR_FILE`); Layout-Rechtecke werden validiert (`x + w <= 12`).
- **Dev-Diagnose:** `routes/dev.ts` wird nur eingehängt, wenn `APP_ENV`/`NODE_ENV` nicht `production` ist.
- **Updates:** `services/updateService.ts` startet je nach `UPDATE_MODE` `scripts/update-docker.sh` bzw. `update-lxc.sh`; `scripts/` enthält außerdem LXC-Installation, systemd-Units und Logrotation. Das Docker-Image heißt `montaglabs/homelab-portal` (Multi-Arch, gebaut bei `vX.Y.Z`-Tags).

## Konventionen

- UI-Texte: sowohl `client/src/i18n/de.json` als auch `en.json` anpassen.
- Dokumentation und nutzersichtbare Texte sind deutsch; `docs/` bei Änderungen am Betrieb mitpflegen.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `release:`).
- Niemals `server/data/config.json`, Zugangsdaten oder `.env` committen. `debug.md`, `plan.md`, `next*.md` sind git-ignorierte lokale Notizen.
- Release: Version in Root-/Client-/Server-`package.json` und Lockfiles erhöhen, `CHANGELOG.md` aktualisieren, Tag `vX.Y.Z` setzen (siehe `docs/development.md`).
