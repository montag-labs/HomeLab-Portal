#!/usr/bin/env bash
set -Eeuo pipefail

readonly UPDATE_SCRIPT_URL="https://raw.githubusercontent.com/montag-labs/HomeLab-Portal/main/scripts/update-lxc.sh"
readonly TEMP_SCRIPT="$(mktemp /run/homelab-portal-update.XXXXXX.sh)"

cleanup() {
  rm -f "${TEMP_SCRIPT}"
}
trap cleanup EXIT

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

install -d -m 755 /run/homelab-portal-update
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 60 "${UPDATE_SCRIPT_URL}" -o "${TEMP_SCRIPT}"
chmod 750 "${TEMP_SCRIPT}"
bash "${TEMP_SCRIPT}"
