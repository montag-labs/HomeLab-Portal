#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
REPOSITORY_BRANCH="main"
APP_DIR="/opt/homelab-portal"
SERVICE_NAME="homelab-portal"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOCK_FILE="/run/homelab-portal-install.lock"
readonly STATE_DIR="/var/lib/homelab-portal"
readonly ADMIN_PASSWORD_FILE="${STATE_DIR}/admin-password"
readonly APP_USER="homelab-portal"
readonly APP_GROUP="homelab-portal"
BACKUP_DIR="/var/backups/homelab-portal"
LOG_DIR="/var/log/homelab-portal"
CONFIG_FILE="${HOMELAB_CONFIG:-/etc/homelab-portal/lxc.config}"
APP_ENV="production"
HOMELAB_PORT="${HOMELAB_PORT:-}"
SWITCH_PORT=false
PORT_OPTION=""
CLI_PORT=""

usage() {
  echo "Verwendung: $0 [--config DATEI] [--port PORT] [--switch PORT]" >&2
}

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
      REPOSITORY_BRANCH|APP_DIR|SERVICE_NAME|SERVICE_FILE|LOCK_FILE|BACKUP_DIR|LOG_DIR|HOMELAB_PORT|APP_ENV|TRUST_PROXY|FORCE_SECURE_COOKIES|ALLOW_INSECURE_TLS|OIDC_ISSUER_URL|OIDC_CLIENT_ID|OIDC_CLIENT_SECRET|OIDC_REDIRECT_URI|OIDC_ALLOWED_GROUPS|OIDC_GROUPS_CLAIM|OIDC_SCOPES|OIDC_DISPLAY_NAME|OIDC_CLIENT_AUTH_METHOD|OIDC_DISABLE_PASSWORD_LOGIN)
        printf -v "${key}" '%s' "${value}"
        ;;
      *)
        echo "Unbekannter Parameter in ${CONFIG_FILE}: ${key}" >&2
        exit 1
        ;;
    esac
  done < "${CONFIG_FILE}"
}

while (( $# > 0 )); do
  case "$1" in
    --config)
      [[ -n "${2:-}" ]] || { usage; exit 1; }
      CONFIG_FILE="$2"
      shift 2
      ;;
    --port|--switch)
      [[ -n "${2:-}" ]] || { usage; exit 1; }
      if [[ -n "${PORT_OPTION}" ]]; then
        echo "--port und --switch dürfen nicht kombiniert oder mehrfach angegeben werden." >&2
        usage
        exit 1
      fi
      PORT_OPTION="$1"
      CLI_PORT="$2"
      shift 2
      ;;
    *)
      echo "Unbekannte Option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${HOMELAB_CONFIG:-}" && "${CONFIG_FILE}" == "/etc/homelab-portal/lxc.config" && ! -f "${CONFIG_FILE}" && -f "/etc/homelab-portal/install.conf" ]]; then
  cp -p /etc/homelab-portal/install.conf "${CONFIG_FILE}"
fi

load_parameters
if [[ -n "${CLI_PORT}" ]]; then
  HOMELAB_PORT="${CLI_PORT}"
fi
if [[ "${PORT_OPTION}" == "--switch" ]]; then
  SWITCH_PORT=true
fi

install_dependencies() {
  local package_dir="$1"
  npm ci --ignore-scripts --prefix "${package_dir}"
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

ensure_runtime_identity() {
  getent group "${APP_GROUP}" >/dev/null || groupadd --system "${APP_GROUP}"
  id -u "${APP_USER}" >/dev/null 2>&1 || useradd --system --gid "${APP_GROUP}" \
    --home-dir "${STATE_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
  install -d -o root -g "${APP_GROUP}" -m 770 "${STATE_DIR}"
  install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${LOG_DIR}"
}

ensure_runtime_secrets() {
  if [[ ! -f "${ADMIN_PASSWORD_FILE}" ]]; then openssl rand -base64 24 > "${ADMIN_PASSWORD_FILE}"; fi
  chown root:"${APP_GROUP}" "${ADMIN_PASSWORD_FILE}"
  chmod 640 "${ADMIN_PASSWORD_FILE}"
}

write_service_file() {
  cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=HomeLab Portal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
UMask=0027
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=${APP_ENV}
Environment=UPDATE_MODE=lxc
Environment=PORT=${HOMELAB_PORT}
Environment=UPDATE_SCRIPT=/usr/local/sbin/homelab-portal-update
Environment=UPDATE_TRIGGER_FILE=/run/homelab-portal/update-request
Environment=ADMIN_PASSWORD_FILE=${ADMIN_PASSWORD_FILE}
Environment=ADMIN_PASSWORD_STORE_FILE=${ADMIN_PASSWORD_FILE}
EnvironmentFile=-${CONFIG_FILE}
NoNewPrivileges=true
RuntimeDirectory=homelab-portal
RuntimeDirectoryMode=0750
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ProtectClock=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE
ReadWritePaths=${APP_DIR}/server/data ${STATE_DIR} ${LOG_DIR}

[Install]
WantedBy=multi-user.target
EOF
  chmod 600 "${SERVICE_FILE}"
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
exec > >(tee -a "${LOG_FILE}") 2>&1
echo "--- ${LOG_LABEL} gestartet: $(date --iso-8601=seconds) ---"
echo "Fortschritt und Fehler werden gleichzeitig nach ${LOG_FILE} protokolliert."

report_failure() {
  local exit_code=$?
  set +e
  trap - ERR
  echo "${LOG_LABEL} abgebrochen (Exit-Code ${exit_code}, Zeile ${BASH_LINENO[0]})." >&2
  echo "Vollständiges Log: ${LOG_FILE}" >&2
  if [[ -f "${SERVICE_FILE}" ]]; then
    systemctl --no-pager --full status "${SERVICE_NAME}" || true
    journalctl -u "${SERVICE_NAME}" -n 100 --no-pager || true
  fi
  exit "${exit_code}"
}

trap report_failure ERR

export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_UPDATE_NOTIFIER=false

echo "Installiere Systempakete ..."
apt-get update
apt-get install -y ca-certificates curl git openssl

echo "Aktualisiere Node.js auf Version 26 ..."
curl --fail --silent --show-error --location https://deb.nodesource.com/setup_26.x | bash -
apt-get install -y nodejs

node --version
npm --version
ensure_runtime_identity
ensure_runtime_secrets

if [[ -e "${APP_DIR}" ]]; then
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    echo "${APP_DIR} existiert, ist aber kein Git-Repository." >&2
    exit 1
  fi
  if [[ "${PORT_OPTION}" == "--port" ]]; then
    echo "--port ist nur für Neuinstallationen vorgesehen. Für eine bestehende Installation bitte --switch verwenden." >&2
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

  if [[ "${SWITCH_PORT}" == true ]]; then
    systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    write_service_file
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
    journalctl -u "${SERVICE_NAME}" -n 100 --no-pager || true
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
  if [[ -f "server/data/oidc.json" ]]; then
    cp -a server/data/oidc.json "${BACKUP_DIR}/oidc-$(date +%Y%m%d-%H%M%S).json"
  fi

  rollback() {
    set +e
    trap - ERR
    echo "Update fehlgeschlagen. Stelle Version ${CURRENT_VERSION} wieder her ..." >&2
    systemctl stop "${SERVICE_NAME}"
    git reset --hard "${CURRENT_COMMIT}"
    npm ci --ignore-scripts --prefix "${APP_DIR}/client"
    npm ci --ignore-scripts --prefix "${APP_DIR}/server"
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
  HOMELAB_PORT="${HOMELAB_PORT:-80}"
  validate_port
  validate_app_environment
  echo "Das Portal wird auf Port ${HOMELAB_PORT} eingerichtet."
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

install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${APP_DIR}/server/data"
chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/server/data" "${LOG_DIR}"

install -d -m 700 "$(dirname "${CONFIG_FILE}")"
if [[ ! -f "${CONFIG_FILE}" && -f "scripts/lxc.config.example" ]]; then
  install -m 600 scripts/lxc.config.example "${CONFIG_FILE}"
  echo "Parameterdatei erstellt: ${CONFIG_FILE}"
fi
install -m 750 scripts/homelab-portal-update-bootstrap.sh /usr/local/sbin/homelab-portal-update
rm -f /usr/local/sbin/homelab-portal-reset-token "${STATE_DIR}/update-token" "${STATE_DIR}/update-token-acknowledged"
install -m 750 scripts/rotate-logs.sh /usr/local/sbin/homelab-portal-rotate-logs
install -m 644 scripts/homelab-portal-log-rotation.service /etc/systemd/system/homelab-portal-log-rotation.service
install -m 644 scripts/homelab-portal-log-rotation.timer /etc/systemd/system/homelab-portal-log-rotation.timer
install -m 644 scripts/homelab-portal-update.service /etc/systemd/system/homelab-portal-update.service
install -m 644 scripts/homelab-portal-update.path /etc/systemd/system/homelab-portal-update.path
rm -f /etc/sudoers.d/homelab-portal-update
write_service_file
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl enable --now homelab-portal-log-rotation.timer
systemctl enable --now homelab-portal-update.path

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
journalctl -u "${SERVICE_NAME}" -n 100 --no-pager || true
if declare -F rollback >/dev/null 2>&1; then
  rollback
fi
exit 1
