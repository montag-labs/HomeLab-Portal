#!/usr/bin/env bash
set -Eeuo pipefail

readonly TOKEN_DIR="/var/lib/homelab-portal"
readonly TOKEN_FILE="${TOKEN_DIR}/update-token"
readonly SERVICE_NAME="homelab-portal"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl ist nicht installiert." >&2
  exit 1
fi

install -d -m 700 "${TOKEN_DIR}"
printf '%s\n' "$(openssl rand -hex 32)" > "${TOKEN_FILE}"
chmod 600 "${TOKEN_FILE}"
rm -f "${TOKEN_DIR}/update-token-acknowledged"
systemctl restart "${SERVICE_NAME}"

echo "Ein neuer Update-Token wurde erzeugt."
echo "Beim nächsten Öffnen des Portals wird er einmalig angezeigt."
