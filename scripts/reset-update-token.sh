#!/usr/bin/env bash
set -Eeuo pipefail

readonly CONFIG_FILE="${HOMELAB_CONFIG:-/etc/homelab-portal/lxc.config}"
TOKEN_DIR="/var/lib/homelab-portal"
TOKEN_FILE="${TOKEN_DIR}/update-token"
readonly SERVICE_NAME="homelab-portal"
readonly APP_GROUP="homelab-portal"

if [[ -f "${CONFIG_FILE}" ]]; then
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "${line}" || "${line:0:1}" == "#" ]] && continue
    if [[ "${line}" =~ ^TOKEN_DIR=(.*)$ ]]; then
      TOKEN_DIR="${BASH_REMATCH[1]}"
      TOKEN_DIR="${TOKEN_DIR#\"}"
      TOKEN_DIR="${TOKEN_DIR%\"}"
    elif [[ "${line}" =~ ^SERVICE_NAME=(.*)$ ]]; then
      SERVICE_NAME="${BASH_REMATCH[1]}"
      SERVICE_NAME="${SERVICE_NAME#\"}"
      SERVICE_NAME="${SERVICE_NAME%\"}"
    fi
  done < "${CONFIG_FILE}"
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl ist nicht installiert." >&2
  exit 1
fi

install -d -o root -g "${APP_GROUP}" -m 770 "${TOKEN_DIR}"
printf '%s\n' "$(openssl rand -hex 32)" > "${TOKEN_FILE}"
chown root:"${APP_GROUP}" "${TOKEN_FILE}"
chmod 640 "${TOKEN_FILE}"
rm -f "${TOKEN_DIR}/update-token-acknowledged"
systemctl restart "${SERVICE_NAME}"

echo "Ein neuer Update-Token wurde erzeugt."
echo "Beim nächsten Öffnen des Portals wird er einmalig angezeigt."
