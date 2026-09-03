#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/homelab-portal"
readonly ARCHIVE_URL="https://codeload.github.com/montag-labs/HomeLab-Portal/tar.gz/refs/heads"
REPOSITORY_BRANCH="main"
SERVICE_NAME="homelab-portal"
BACKUP_DIR="/var/backups/homelab-portal"
LOCK_FILE="/run/homelab-portal-update.lock"
LOG_DIR="/var/log/homelab-portal"
LOG_FILE="${LOG_DIR}/homelab-portal-update.log"
PROGRESS_FILE="/run/homelab-portal/update-progress.json"
SOURCE_ARCHIVE=""
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
      REPOSITORY_BRANCH|APP_ENV|SERVICE_FILE|TRUST_PROXY|FORCE_SECURE_COOKIES|ALLOW_INSECURE_TLS)
        printf -v "${key}" '%s' "${value}" ;;
      *) echo "Unbekannter Parameter in ${CONFIG_FILE}: ${key}" >&2; exit 1 ;;
    esac
  done < "${CONFIG_FILE}"
  LOG_FILE="${LOG_DIR}/homelab-portal-update.log"
}

load_parameters
HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"

write_progress() {
  local state="$1" percent="$2" step="$3" target_version="${4:-}"
  printf '{"state":"%s","percent":%s,"step":"%s","targetVersion":"%s","updatedAt":"%s"}\n' \
    "${state}" "${percent}" "${step}" "${target_version}" "$(date --iso-8601=seconds)" > "${PROGRESS_FILE}.tmp"
  chmod 644 "${PROGRESS_FILE}.tmp"
  mv -f "${PROGRESS_FILE}.tmp" "${PROGRESS_FILE}"
}

install -d -m 750 "${LOG_DIR}"
touch "${LOG_FILE}"
chmod 640 "${LOG_FILE}"
exec >>"${LOG_FILE}" 2>&1
echo "--- Update gestartet: $(date --iso-8601=seconds) ---"
write_progress updating 2 "Update wird vorbereitet"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_UPDATE_NOTIFIER=false

echo "Aktualisiere Node.js auf Version 26 ..."
write_progress updating 10 "Node.js wird aktualisiert"
apt-get update
apt-get install -y ca-certificates curl
curl --fail --silent --show-error --location https://deb.nodesource.com/setup_26.x | bash -
apt-get install -y nodejs
node --version
npm --version
write_progress updating 18 "Repository wird geprüft"

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Ein Update läuft bereits." >&2; exit 1; }

cd "${APP_DIR}"
HAS_GIT=false
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HAS_GIT=true
fi
readonly CURRENT_COMMIT="$([[ "${HAS_GIT}" == true ]] && git rev-parse HEAD || echo unknown)"
readonly CURRENT_VERSION="$(node -p "require('./package.json').version")"

TARGET_COMMIT="unknown"
TARGET_VERSION=""
if [[ "${HAS_GIT}" == true ]]; then
  if git fetch --depth 1 --tags --force origin "${REPOSITORY_BRANCH}"; then
    TARGET_COMMIT="$(git rev-parse "origin/${REPOSITORY_BRANCH}")"
    TARGET_VERSION="$(git show "${TARGET_COMMIT}:package.json" | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => console.log(JSON.parse(input).version));')"
  else
    echo "Git-Repository konnte nicht aktualisiert werden. Verwende GitHub-Tarball-Fallback ..."
    HAS_GIT=false
  fi
fi
if [[ "${HAS_GIT}" == false ]]; then
  SOURCE_ARCHIVE="$(mktemp "/tmp/homelab-portal-${REPOSITORY_BRANCH}.XXXXXX.tar.gz")"
  echo "Kein Git-Repository gefunden. Verwende GitHub-Tarball-Fallback ..."
  curl --fail --silent --show-error --location \
    "${ARCHIVE_URL}/${REPOSITORY_BRANCH}" -o "${SOURCE_ARCHIVE}"
  TARGET_VERSION="$(tar -xOzf "${SOURCE_ARCHIVE}" --wildcards '*/package.json' | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => console.log(JSON.parse(input).version));')"
fi

echo "Aktueller Stand: ${CURRENT_VERSION} (${CURRENT_COMMIT:0:12})"
echo "Remote-Stand:    ${TARGET_VERSION} (${TARGET_COMMIT:0:12})"
write_progress updating 30 "Zielversion ${TARGET_VERSION} wird vorbereitet" "${TARGET_VERSION}"

if [[ "${CURRENT_VERSION}" == "${TARGET_VERSION}" ]] || [[ "${HAS_GIT}" == true && "${CURRENT_COMMIT}" == "${TARGET_COMMIT}" ]]; then
  echo "HomeLab-Portal ist bereits aktuell (${CURRENT_VERSION})."
  exit 0
fi

install -d -m 700 "${BACKUP_DIR}"
if [[ -f server/data/config.json ]]; then
  cp -a server/data/config.json "${BACKUP_DIR}/config-$(date +%Y%m%d-%H%M%S).json"
fi
if [[ -f server/data/oidc.json ]]; then
  cp -a server/data/oidc.json "${BACKUP_DIR}/oidc-$(date +%Y%m%d-%H%M%S).json"
fi

STAGING_DIR=""
PREVIOUS_DIR=""
SWITCHED=false

rollback() {
  set +e
  trap - ERR
  write_progress failed 100 "Update fehlgeschlagen" "${TARGET_VERSION:-}"
  if [[ "${SWITCHED}" == true && -n "${PREVIOUS_DIR}" && -d "${PREVIOUS_DIR}" ]]; then
    echo "Update fehlgeschlagen. Stelle ${CURRENT_VERSION} wieder her ..." >&2
    systemctl stop "${SERVICE_NAME}"
    mv "${APP_DIR}" "${STAGING_DIR}.failed"
    mv "${PREVIOUS_DIR}" "${APP_DIR}"
    systemctl daemon-reload
    systemctl start "${SERVICE_NAME}"
  fi
  [[ -n "${STAGING_DIR}" && -d "${STAGING_DIR}" ]] && rm -rf "${STAGING_DIR}"
  [[ -n "${SOURCE_ARCHIVE}" ]] && rm -f "${SOURCE_ARCHIVE}"
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
STAGING_DIR="$(mktemp -d "${APP_DIR}.staging.XXXXXX")"
PREVIOUS_DIR="${APP_DIR}.previous-$(date +%Y%m%d-%H%M%S)"
echo "Baue Update in ${STAGING_DIR} ..."
write_progress updating 40 "Update wird gebaut" "${TARGET_VERSION}"
if [[ "${HAS_GIT}" == true ]]; then
  git archive --format=tar "${TARGET_COMMIT}" | tar -x -C "${STAGING_DIR}"
  cp -a "${APP_DIR}/.git" "${STAGING_DIR}/.git"
else
  tar -xzf "${SOURCE_ARCHIVE}" --strip-components=1 -C "${STAGING_DIR}"
fi
cd "${STAGING_DIR}"
if [[ -d "${APP_DIR}/server/data" ]]; then
  install -d -m 700 server/data
  cp -a "${APP_DIR}/server/data/." server/data/
fi
npm ci --ignore-scripts --prefix client
write_progress updating 58 "Client-Abhängigkeiten installiert" "${TARGET_VERSION}"
npm ci --ignore-scripts --prefix server
if [[ -f client/node_modules/esbuild/install.js ]]; then
  node client/node_modules/esbuild/install.js
fi
if [[ -f server/node_modules/esbuild/install.js ]]; then
  node server/node_modules/esbuild/install.js
fi
npm run build
write_progress updating 78 "Anwendung erfolgreich gebaut" "${TARGET_VERSION}"
chown -R homelab-portal:homelab-portal server/data "${LOG_DIR}"
echo "Wechsle auf die erfolgreich gebaute Version ..."
write_progress updating 88 "Neue Version wird aktiviert" "${TARGET_VERSION}"
systemctl stop "${SERVICE_NAME}"
SWITCHED=true
mv "${APP_DIR}" "${PREVIOUS_DIR}"
mv "${STAGING_DIR}" "${APP_DIR}"
cd "${APP_DIR}"
install -m 750 scripts/homelab-portal-update-bootstrap.sh /usr/local/sbin/homelab-portal-update
install -m 750 scripts/rotate-logs.sh /usr/local/sbin/homelab-portal-rotate-logs
install -m 644 scripts/homelab-portal-log-rotation.service /etc/systemd/system/homelab-portal-log-rotation.service
install -m 644 scripts/homelab-portal-log-rotation.timer /etc/systemd/system/homelab-portal-log-rotation.timer
install -m 644 scripts/homelab-portal-update.service /etc/systemd/system/homelab-portal-update.service
install -m 644 scripts/homelab-portal-update.path /etc/systemd/system/homelab-portal-update.path
systemctl daemon-reload
systemctl enable --now homelab-portal-log-rotation.timer
systemctl enable --now homelab-portal-update.path
systemctl start "${SERVICE_NAME}"

for attempt in {1..30}; do
  write_progress updating 90 "Dienst wird gestartet" "${TARGET_VERSION}"
  if curl --fail --silent "${HEALTH_URL}" >/dev/null 2>&1; then
    trap - ERR
    rm -f "${PROGRESS_FILE}" "${PROGRESS_FILE}.tmp"
    rm -f "${SOURCE_ARCHIVE}"
    echo "Update auf ${TARGET_VERSION} erfolgreich abgeschlossen."
    exit 0
  fi
  sleep 1
done

rollback
exit 1
