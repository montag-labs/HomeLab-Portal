#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
readonly REPOSITORY_BRANCH="main"
readonly APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly LOCK_FILE="/tmp/homelab-portal-docker-update.lock"
readonly LOG_DIR="${LOG_DIR:-${APP_DIR}/server/data/logs}"
readonly LOG_FILE="${LOG_DIR}/homelab-portal-docker-update.log"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker wurde nicht gefunden." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Ein Docker-Update läuft bereits." >&2; exit 1; }

cd "${APP_DIR}"
if [[ ! -d .git ]]; then
  echo "${APP_DIR} ist kein Git-Repository." >&2
  exit 1
fi

install -d -m 750 "${LOG_DIR}"
touch "${LOG_FILE}"
chmod 640 "${LOG_FILE}"
exec >>"${LOG_FILE}" 2>&1
echo "--- Docker-Update gestartet: $(date --iso-8601=seconds) ---"

echo "Prüfe ${REPOSITORY_URL} ..."
git fetch --depth 1 origin "${REPOSITORY_BRANCH}"
current_commit="$(git rev-parse HEAD)"
target_commit="$(git rev-parse "origin/${REPOSITORY_BRANCH}")"

if [[ "${current_commit}" == "${target_commit}" ]]; then
  echo "HomeLab-Portal ist bereits aktuell."
  exit 0
fi

echo "Aktualisiere Docker-Deployment ..."
git reset --hard "${target_commit}"
docker compose pull
docker compose up -d --pull always --force-recreate --remove-orphans
docker compose ps
echo "Docker-Update erfolgreich abgeschlossen."