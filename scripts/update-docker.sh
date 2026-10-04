#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
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
# Compose-Datei und Skripte stammen aus dem neuesten stabilen Release, passend zum Image :latest.
release_tag="$(
  curl --fail --silent --location --connect-timeout 15 --max-time 30 \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/montag-labs/HomeLab-Portal/releases/latest" 2>/dev/null \
    | sed -n 's/.*"tag_name": *"\(v[0-9]\{1,\}\.[0-9]\{1,\}\.[0-9]\{1,\}\)".*/\1/p' | head -n 1
)" || true
if [[ ! "${release_tag:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  release_tag="$(git ls-remote --tags --refs "${REPOSITORY_URL}" 'v*' 2>/dev/null \
    | sed -n 's#.*refs/tags/\(v[0-9]\{1,\}\.[0-9]\{1,\}\.[0-9]\{1,\}\)$#\1#p' | sort -V | tail -n 1)" || true
fi
if [[ ! "${release_tag:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Neuester Release konnte nicht ermittelt werden." >&2
  exit 1
fi
echo "Neuester stabiler Release: ${release_tag}"
git fetch --depth 1 --force origin "refs/tags/${release_tag}:refs/update-target"
current_commit="$(git rev-parse HEAD)"
target_commit="$(git rev-parse "refs/update-target^{commit}")"

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