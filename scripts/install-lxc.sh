#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
REPOSITORY_BRANCH="main"
APP_DIR="/opt/homelab-portal"
SERVICE_NAME="homelab-portal"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOCK_FILE="/run/homelab-portal-install.lock"
readonly TOKEN_DIR="/var/lib/homelab-portal"
readonly TOKEN_FILE="${TOKEN_DIR}/update-token"
BACKUP_DIR="/var/backups/homelab-portal"
LOG_DIR="/var/log/homelab-portal"
CONFIG_FILE="${HOMELAB_CONFIG:-/etc/homelab-portal/lxc.config}"
if [[ -z "${HOMELAB_CONFIG:-}" && ! -f "${CONFIG_FILE}" && -f "/etc/homelab-portal/install.conf" ]]; then
  cp -p /etc/homelab-portal/install.conf "${CONFIG_FILE}"
fi
APP_ENV="production"
HOMELAB_PORT="${HOMELAB_PORT:-}"
SWITCH_PORT=false

load_parameters() {
  [[ -f "${CONFIG_FILE}" ]] || return 0
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "${line}" || "${line:0:1}" == "#" ]] && continue
    if [[ ! "${line}" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      echo "Ungültige Zeile in ${CONFIG_FILE}: ${line}" >&2
      exit 1
    fi
    local key="${BASH_REMATCH[1]}"
    local value="${BASH_REMATCH[2]}"
    value="${value#\"}"
    value="${value%\"}"
    case "${key}" in
      REPOSITORY_BRANCH|APP_DIR|SERVICE_NAME|SERVICE_FILE|LOCK_FILE|BACKUP_DIR|LOG_DIR|HOMELAB_PORT|APP_ENV)
        printf -v "${key}" '%s' "${value}"
        ;;
      *)
        echo "Unbekannter Parameter in ${CONFIG_FILE}: ${key}" >&2
        exit 1
        ;;
    esac
  done < "${CONFIG_FILE}"
}

load_parameters

if [[ "${1:-}" == "--config" ]]; then
  if [[ -z "${2:-}" ]]; then
    echo "Verwendung: $0 [--config DATEI] [--switch PORT]" >&2
    exit 1
  fi
  CONFIG_FILE="$2"
  load_parameters
  shift 2
fi

if [[ "${1:-}" == "--switch" ]]; then
  if [[ -z "${2:-}" || -n "${3:-}" ]]; then
    echo "Verwendung: $0 [--config DATEI] [--switch PORT]" >&2
    exit 1
  fi
  HOMELAB_PORT="$2"
  SWITCH_PORT=true
elif [[ -n "${1:-}" ]]; then
  echo "Unbekannte Option: $1" >&2
  echo "Verwendung: $0 [--config DATEI] [--switch PORT]" >&2
  exit 1
fi

install_dependencies() {
  local package_dir="$1"
  npm install --ignore-scripts --prefix "${package_dir}"
  if [[ -f "${package_dir}/node_modules/esbuild/install.js" ]]; then
    node "${package_dir}/node_modules/esbuild/install.js"
  fi
}

validate_port() {
  if [[ ! "${HOMELAB_PORT}" =~ ^[0-9]+$ ]] || (( 10#${HOMELAB_PORT} < 1 || 10#${HOMELAB_PORT} > 65535 )); then
    echo "Ungültiger Portal-Port: '${HOMELAB_PORT}'. Erlaubt sind Werte von 1 bis 65535." >&2
    exit 1
  fi
}

validate_app_environment() {
  if [[ "${APP_ENV}" != "production" && "${APP_ENV}" != "development" ]]; then
    echo "APP_ENV muss production oder development sein." >&2
    exit 1
  fi
}

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

install -d -m 750 "${LOG_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  LOG_FILE="${LOG_DIR}/homelab-portal-update.log"
  LOG_LABEL="Update"
else
  LOG_FILE="${LOG_DIR}/homelab-portal-install.log"
  LOG_LABEL="Installation"
fi
touch "${LOG_FILE}"
chmod 640 "${LOG_FILE}"
exec >>"${LOG_FILE}" 2>&1
echo "--- ${LOG_LABEL} gestartet: $(date --iso-8601=seconds) ---"

export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_UPDATE_NOTIFIER=false

echo "Installiere Systempakete ..."
apt-get update
apt-get install -y ca-certificates curl git openssl sudo

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
  if [[ "${SWITCH_PORT}" == false && -z "${HOMELAB_PORT}" && -f "${SERVICE_FILE}" ]]; then
    HOMELAB_PORT="$(sed -n 's/^Environment=PORT=//p' "${SERVICE_FILE}" | tail -n 1 | tr -d '[:space:]')"
  fi
  HOMELAB_PORT="${HOMELAB_PORT:-80}"
  if [[ "${SWITCH_PORT}" == true ]]; then
    echo "Portwechsel angefordert. Neuer Portal-Port: ${HOMELAB_PORT}"
  else
    echo "Bestehende Installation erkannt. Verwende Portal-Port: ${HOMELAB_PORT}"
  fi
  validate_port
  validate_app_environment

  install -d -m 700 "${TOKEN_DIR}"
  if [[ ! -f "${TOKEN_FILE}" ]]; then
    openssl rand -hex 32 > "${TOKEN_FILE}"
    chmod 600 "${TOKEN_FILE}"
  fi

  if [[ "${SWITCH_PORT}" == true ]]; then
    systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
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
Environment=NODE_ENV=${APP_ENV}
Environment=UPDATE_MODE=lxc
Environment=PORT=${HOMELAB_PORT}
Environment=UPDATE_SCRIPT=/usr/local/sbin/homelab-portal-update
Environment=UPDATE_TOKEN_FILE=/var/lib/homelab-portal/update-token
EnvironmentFile=-${CONFIG_FILE}

[Install]
WantedBy=multi-user.target
EOF
    chmod 600 "${SERVICE_FILE}"
    systemctl daemon-reload
    systemctl enable --now "${SERVICE_NAME}"
    HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"
    for attempt in {1..30}; do
      if curl --fail --silent "${HEALTH_URL}" >/dev/null 2>&1; then
        LXC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
        LXC_IP="${LXC_IP:-$(hostname -i 2>/dev/null | awk '{print $1}')}"
        LXC_IP="${LXC_IP:-LXC-IP-nicht-ermittelbar}"
        echo "Port wurde erfolgreich geändert."
        echo "Portal: http://${LXC_IP}:${HOMELAB_PORT}"
        exit 0
      fi
      sleep 1
    done
    echo "Portwechsel fehlgeschlagen. Der Service konnte auf Port ${HOMELAB_PORT} nicht erreicht werden." >&2
    systemctl --no-pager --full status "${SERVICE_NAME}" || true
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
  install_dependencies "${APP_DIR}/client"
  install_dependencies "${APP_DIR}/server"
  npm run build
else
  if [[ "${SWITCH_PORT}" == true ]]; then
    echo "Keine bestehende Installation unter ${APP_DIR} gefunden. Portwechsel nicht möglich." >&2
    echo "Bitte zuerst die Installation ohne --switch ausführen." >&2
    exit 1
  fi
  if [[ -z "${HOMELAB_PORT}" ]]; then
    HOMELAB_PORT="80"
    read -r -p "Welchen Port soll das Portal verwenden [${HOMELAB_PORT}]: " entered_port
    HOMELAB_PORT="${entered_port:-${HOMELAB_PORT}}"
  fi
  validate_port
  validate_app_environment
  echo "Das Portal wird auf Port ${HOMELAB_PORT} eingerichtet."
  install -d -m 700 "${TOKEN_DIR}"
  if [[ ! -f "${TOKEN_FILE}" ]]; then
    openssl rand -hex 32 > "${TOKEN_FILE}"
    chmod 600 "${TOKEN_FILE}"
  fi
  echo "Klone ${REPOSITORY_URL} ..."
  install -d -m 755 /opt
  git clone --depth 1 --branch "${REPOSITORY_BRANCH}" "${REPOSITORY_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
  echo "Installiere Projektabhängigkeiten ..."
  install_dependencies "${APP_DIR}/client"
  install_dependencies "${APP_DIR}/server"
  echo "Erzeuge den Produktiv-Build ..."
  npm run build
fi

install -d -m 700 "$(dirname "${CONFIG_FILE}")"
if [[ ! -f "${CONFIG_FILE}" && -f "scripts/lxc.config.example" ]]; then
  install -m 600 scripts/lxc.config.example "${CONFIG_FILE}"
  echo "Parameterdatei erstellt: ${CONFIG_FILE}"
fi
install -m 750 scripts/update-lxc.sh /usr/local/sbin/homelab-portal-update
install -m 750 scripts/reset-update-token.sh /usr/local/sbin/homelab-portal-reset-token
install -m 750 scripts/rotate-logs.sh /usr/local/sbin/homelab-portal-rotate-logs
install -m 644 scripts/homelab-portal-log-rotation.service /etc/systemd/system/homelab-portal-log-rotation.service
install -m 644 scripts/homelab-portal-log-rotation.timer /etc/systemd/system/homelab-portal-log-rotation.timer

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
Environment=NODE_ENV=${APP_ENV}
Environment=UPDATE_MODE=lxc
Environment=PORT=${HOMELAB_PORT}
Environment=UPDATE_SCRIPT=/usr/local/sbin/homelab-portal-update
Environment=UPDATE_TOKEN_FILE=${TOKEN_FILE}
EnvironmentFile=-${CONFIG_FILE}

[Install]
WantedBy=multi-user.target
EOF

chmod 600 "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl enable --now homelab-portal-log-rotation.timer

HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"
for attempt in {1..30}; do
  if curl --fail --silent "${HEALTH_URL}" >/dev/null 2>&1; then
    trap - ERR
    LXC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    LXC_IP="${LXC_IP:-$(hostname -i 2>/dev/null | awk '{print $1}')}"
    LXC_IP="${LXC_IP:-LXC-IP-nicht-ermittelbar}"
    echo "HomeLab-Portal wurde erfolgreich installiert oder aktualisiert."
    echo "Portal: http://${LXC_IP}:${HOMELAB_PORT}"
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
