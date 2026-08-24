#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/homelab-portal"
REPOSITORY_BRANCH="main"
SERVICE_NAME="homelab-portal"
BACKUP_DIR="/var/backups/homelab-portal"
LOCK_FILE="/run/homelab-portal-update.lock"
LOG_DIR="/var/log/homelab-portal"
LOG_FILE="${LOG_DIR}/homelab-portal-update.log"
HOMELAB_PORT="${PORT:-80}"
CONFIG_FILE="${HOMELAB_CONFIG:-/etc/homelab-portal/lxc.config}"
if [[ -z "${HOMELAB_CONFIG:-}" && ! -f "${CONFIG_FILE}" && -f "/etc/homelab-portal/install.conf" ]]; then
  cp -p /etc/homelab-portal/install.conf "${CONFIG_FILE}"
fi

load_parameters() {
  [[ -f "${CONFIG_FILE}" ]] || return 0
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "${line}" || "${line:0:1}" == "#" ]] && continue
    [[ "${line}" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]] || { echo "Ungültige Zeile in ${CONFIG_FILE}: ${line}" >&2; exit 1; }
    local key="${BASH_REMATCH[1]}" value="${BASH_REMATCH[2]}"
    value="${value#\"}"; value="${value%\"}"
    case "${key}" in
      APP_DIR|SERVICE_NAME|BACKUP_DIR|LOCK_FILE|LOG_DIR|HOMELAB_PORT)
        printf -v "${key}" '%s' "${value}" ;;
      REPOSITORY_BRANCH|APP_ENV|SERVICE_FILE)
        printf -v "${key}" '%s' "${value}" ;;
      *) echo "Unbekannter Parameter in ${CONFIG_FILE}: ${key}" >&2; exit 1 ;;
    esac
  done < "${CONFIG_FILE}"
  LOG_FILE="${LOG_DIR}/homelab-portal-update.log"
}

load_parameters
HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"

install -d -m 750 "${LOG_DIR}"
touch "${LOG_FILE}"
chmod 640 "${LOG_FILE}"
exec >>"${LOG_FILE}" 2>&1
echo "--- Update gestartet: $(date --iso-8601=seconds) ---"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Ein Update läuft bereits." >&2; exit 1; }

cd "${APP_DIR}"
readonly CURRENT_COMMIT="$(git rev-parse HEAD)"
readonly CURRENT_VERSION="$(node -p "require('./package.json').version")"

git fetch --depth 1 origin "${REPOSITORY_BRANCH}"
readonly TARGET_COMMIT="$(git rev-parse "origin/${REPOSITORY_BRANCH}")"
readonly TARGET_VERSION="$(git show "${TARGET_COMMIT}:package.json" | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => console.log(JSON.parse(input).version));')"

if [[ "${CURRENT_COMMIT}" == "${TARGET_COMMIT}" ]]; then
  echo "HomeLab-Portal ist bereits aktuell (${CURRENT_VERSION})."
  exit 0
fi

install -d -m 700 "${BACKUP_DIR}"
if [[ -f server/data/config.json ]]; then
  cp -a server/data/config.json "${BACKUP_DIR}/config-$(date +%Y%m%d-%H%M%S).json"
fi

rollback() {
  set +e
  trap - ERR
  echo "Update fehlgeschlagen. Stelle ${CURRENT_VERSION} wieder her ..." >&2
  systemctl stop "${SERVICE_NAME}"
  git reset --hard "${CURRENT_COMMIT}"
  npm install --ignore-scripts --prefix client
  npm install --ignore-scripts --prefix server
  if [[ -f client/node_modules/esbuild/install.js ]]; then
    node client/node_modules/esbuild/install.js
  fi
  if [[ -f server/node_modules/esbuild/install.js ]]; then
    node server/node_modules/esbuild/install.js
  fi
  npm run build
  systemctl daemon-reload
  systemctl start "${SERVICE_NAME}"
  echo "Rollback abgeschlossen." >&2
}

ensure_service_running() {
  if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
    systemctl daemon-reload
    systemctl start "${SERVICE_NAME}"
  fi
}

trap ensure_service_running EXIT

trap rollback ERR
echo "Aktualisiere von ${CURRENT_VERSION} auf ${TARGET_VERSION} ..."
echo "Stoppe Portal-Service für den Build ..."
systemctl stop "${SERVICE_NAME}"
git reset --hard "${TARGET_COMMIT}"
npm install --ignore-scripts --prefix client
npm install --ignore-scripts --prefix server
if [[ -f client/node_modules/esbuild/install.js ]]; then
  node client/node_modules/esbuild/install.js
fi
if [[ -f server/node_modules/esbuild/install.js ]]; then
  node server/node_modules/esbuild/install.js
fi
npm run build
install -m 750 scripts/update-lxc.sh /usr/local/sbin/homelab-portal-update
systemctl daemon-reload
systemctl start "${SERVICE_NAME}"

for attempt in {1..30}; do
  if curl --fail --silent "${HEALTH_URL}" >/dev/null 2>&1; then
    trap - ERR
    echo "Update auf ${TARGET_VERSION} erfolgreich abgeschlossen."
    exit 0
  fi
  sleep 1
done

rollback
exit 1
