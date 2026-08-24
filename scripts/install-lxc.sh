#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
readonly REPOSITORY_BRANCH="main"
readonly APP_DIR="/opt/homelab-portal"
readonly SERVICE_NAME="homelab-portal"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly LOCK_FILE="/run/homelab-portal-install.lock"
HOMELAB_PORT="${HOMELAB_PORT:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Dieses Script unterstützt nur Debian- und Ubuntu-Systeme mit apt-get." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Installation oder Update läuft bereits." >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_UPDATE_NOTIFIER=false

echo "Installiere Systempakete ..."
apt-get update
apt-get install -y ca-certificates curl git sudo

if ! command -v node >/dev/null 2>&1; then
  echo "Installiere Node.js LTS ..."
  curl --fail --silent --show-error --location https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi

node --version
npm --version

if [[ -e "${APP_DIR}" ]]; then
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    echo "${APP_DIR} existiert, ist aber kein Git-Repository." >&2
    exit 1
  fi
  if [[ -z "${HOMELAB_PORT}" && -f "${SERVICE_FILE}" ]]; then
    HOMELAB_PORT="$(sed -n 's/^Environment=PORT=//p' "${SERVICE_FILE}" | tail -n 1)"
  fi
  HOMELAB_PORT="${HOMELAB_PORT:-80}"
  echo "Bestehende Installation erkannt. Der bisherige Port ${HOMELAB_PORT} wird beibehalten."
  if [[ ! "${HOMELAB_PORT}" =~ ^[0-9]+$ ]] || (( HOMELAB_PORT < 1 || HOMELAB_PORT > 65535 )); then
    echo "HOMELAB_PORT muss eine Zahl zwischen 1 und 65535 sein." >&2
    exit 1
  fi

  cd "${APP_DIR}"
  CURRENT_COMMIT="$(git rev-parse HEAD)"
  CURRENT_VERSION="$(node -p "require('./package.json').version")"
  echo "Installierte Version: ${CURRENT_VERSION} (${CURRENT_COMMIT:0:12})"
  echo "Prüfe neue Version aus ${REPOSITORY_URL} ..."
  git fetch --depth 1 origin "${REPOSITORY_BRANCH}"
  TARGET_COMMIT="$(git rev-parse "origin/${REPOSITORY_BRANCH}")"
  TARGET_VERSION="$(git show "${TARGET_COMMIT}:package.json" | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => console.log(JSON.parse(input).version));')"
  echo "Verfügbare Version: ${TARGET_VERSION} (${TARGET_COMMIT:0:12})"
  if [[ "${CURRENT_COMMIT}" == "${TARGET_COMMIT}" ]]; then
    echo "HomeLab-Portal ist bereits aktuell."
    exit 0
  fi

  BACKUP_DIR="/var/backups/homelab-portal"
  install -d -m 700 "${BACKUP_DIR}"
  if [[ -f "server/data/config.json" ]]; then
    cp -a server/data/config.json "${BACKUP_DIR}/config-$(date +%Y%m%d-%H%M%S).json"
  fi

  rollback() {
    set +e
    trap - ERR
    echo "Update fehlgeschlagen. Stelle Version ${CURRENT_VERSION} wieder her ..." >&2
    systemctl stop "${SERVICE_NAME}"
    git reset --hard "${CURRENT_COMMIT}"
    npm run install:all
    npm run build
    systemctl daemon-reload
    systemctl start "${SERVICE_NAME}"
    echo "Rollback abgeschlossen." >&2
  }

  trap rollback ERR
  systemctl stop "${SERVICE_NAME}"
  git reset --hard "${TARGET_COMMIT}"
  npm run install:all
  npm run build
else
  if [[ -z "${HOMELAB_PORT}" ]]; then
    HOMELAB_PORT="80"
    read -r -p "Welchen Port soll das Portal verwenden [${HOMELAB_PORT}]: " entered_port
    HOMELAB_PORT="${entered_port:-${HOMELAB_PORT}}"
  fi
  if [[ ! "${HOMELAB_PORT}" =~ ^[0-9]+$ ]] || (( HOMELAB_PORT < 1 || HOMELAB_PORT > 65535 )); then
    echo "HOMELAB_PORT muss eine Zahl zwischen 1 und 65535 sein." >&2
    exit 1
  fi
  echo "Das Portal wird auf Port ${HOMELAB_PORT} eingerichtet."
  echo "Klone ${REPOSITORY_URL} ..."
  install -d -m 755 /opt
  git clone --depth 1 --branch "${REPOSITORY_BRANCH}" "${REPOSITORY_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
  echo "Installiere Projektabhängigkeiten ..."
  npm run install:all
  echo "Erzeuge den Produktiv-Build ..."
  npm run build
fi

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=HomeLab Portal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=UPDATE_MODE=lxc
Environment=PORT=${HOMELAB_PORT}

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"
for attempt in {1..10}; do
  if curl --fail --silent --show-error "${HEALTH_URL}" >/dev/null; then
    trap - ERR
    echo "HomeLab-Portal wurde erfolgreich installiert oder aktualisiert."
    echo "Portal: http://<CONTAINER-IP>:${HOMELAB_PORT}"
    exit 0
  fi
  sleep 1
done

echo "Der Service wurde gestartet, der Healthcheck ist jedoch fehlgeschlagen." >&2
systemctl --no-pager --full status "${SERVICE_NAME}" || true
if declare -F rollback >/dev/null 2>&1; then
  rollback
fi
exit 1
