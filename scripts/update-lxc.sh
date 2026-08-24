#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_DIR="/opt/homelab-portal"
readonly SERVICE_NAME="homelab-portal"
readonly BACKUP_DIR="/var/backups/homelab-portal"
readonly LOCK_FILE="/run/homelab-portal-update.lock"
readonly HEALTH_URL="http://127.0.0.1:${PORT:-80}/api/config"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Ein Update läuft bereits." >&2; exit 1; }

cd "${APP_DIR}"
readonly CURRENT_COMMIT="$(git rev-parse HEAD)"
readonly CURRENT_VERSION="$(node -p "require('./package.json').version")"

git fetch --depth 1 origin main
readonly TARGET_COMMIT="$(git rev-parse origin/main)"
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

trap rollback ERR
echo "Aktualisiere von ${CURRENT_VERSION} auf ${TARGET_VERSION} ..."
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
