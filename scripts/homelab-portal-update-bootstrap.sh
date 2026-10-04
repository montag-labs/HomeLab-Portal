#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_SLUG="montag-labs/HomeLab-Portal"
readonly CONFIG_FILE="${HOMELAB_CONFIG:-/etc/homelab-portal/lxc.config}"
readonly TEMP_SCRIPT="$(mktemp /run/homelab-portal-update.XXXXXX.sh)"

cleanup() {
  rm -f "${TEMP_SCRIPT}"
}
trap cleanup EXIT

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

config_value() {
  [[ -f "${CONFIG_FILE}" ]] || return 0
  sed -n "s/^$1=//p" "${CONFIG_FILE}" | tr -d '"' | tail -n 1
}

# Das Update-Script stammt aus dem neuesten stabilen Release (Standard) oder, im Kanal "branch", aus dem Branch.
channel="$(config_value UPDATE_CHANNEL)"
if [[ "${channel:-release}" == "branch" ]]; then
  ref="$(config_value REPOSITORY_BRANCH)"
  ref="${ref:-main}"
else
  tag="$(curl --fail --silent --location --connect-timeout 15 --max-time 30 \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${REPOSITORY_SLUG}/releases/latest" 2>/dev/null \
    | sed -n 's/.*"tag_name": *"\(v[0-9]\{1,\}\.[0-9]\{1,\}\.[0-9]\{1,\}\)".*/\1/p' | head -n 1)" || true
  if [[ ! "${tag:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Neuester Release konnte nicht ermittelt werden." >&2
    exit 1
  fi
  ref="${tag}"
  export RELEASE_TAG="${tag}"
fi

install -d -m 755 /run/homelab-portal-update
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 60 \
  "https://raw.githubusercontent.com/${REPOSITORY_SLUG}/${ref}/scripts/update-lxc.sh" -o "${TEMP_SCRIPT}"
chmod 750 "${TEMP_SCRIPT}"
bash "${TEMP_SCRIPT}"
