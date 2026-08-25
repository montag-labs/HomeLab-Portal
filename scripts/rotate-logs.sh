#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOG_DIR="${LOG_DIR:-${APP_DIR}/server/data/logs}"
ROTATION="${LOG_ROTATION:-}"
ARCHIVE_COUNT="${LOG_ARCHIVE_COUNT:-}"
CONFIG_FILE="${APP_DIR}/server/data/config.json"

if [[ -z "${ROTATION}" && -f "${CONFIG_FILE}" ]] && command -v node >/dev/null 2>&1; then
  ROTATION="$(node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(c.settings?.logPolicy?.rotation ?? "day")' "${CONFIG_FILE}")"
fi
if [[ -z "${ARCHIVE_COUNT}" && -f "${CONFIG_FILE}" ]] && command -v node >/dev/null 2>&1; then
  ARCHIVE_COUNT="$(node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(String(c.settings?.logPolicy?.archiveCount ?? 7))' "${CONFIG_FILE}")"
fi

ROTATION="${ROTATION:-day}"
ARCHIVE_COUNT="${ARCHIVE_COUNT:-7}"
case "${ROTATION}" in day) AGE_MINUTES=1440 ;; week) AGE_MINUTES=10080 ;; month) AGE_MINUTES=43200 ;; year) AGE_MINUTES=525600 ;; *) echo "Ungültige Rotation: ${ROTATION}" >&2; exit 1 ;; esac
if [[ ! "${ARCHIVE_COUNT}" =~ ^[0-9]+$ || ${ARCHIVE_COUNT} -gt 100 ]]; then
  echo "Ungültige Archivanzahl: ${ARCHIVE_COUNT}" >&2
  exit 1
fi

install -d -m 750 "${LOG_DIR}"
shopt -s nullglob
for log_file in "${LOG_DIR}"/*.log; do
  [[ -f "${log_file}" ]] || continue
  if [[ "$(find "${log_file}" -mmin "+${AGE_MINUTES}" -print -quit)" != "${log_file}" ]]; then continue; fi
  base_name="$(basename "${log_file}")"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  archive_file="${LOG_DIR}/${base_name}.${timestamp}.gz"
  temporary_file="${archive_file}.tmp"
  gzip -c "${log_file}" > "${temporary_file}"
  chmod 640 "${temporary_file}"
  mv -f "${temporary_file}" "${archive_file}"
  : > "${log_file}"
  mapfile -t archives < <(printf '%s\n' "${LOG_DIR}/${base_name}."*.gz 2>/dev/null | sort -r)
  for old_archive in "${archives[@]:${ARCHIVE_COUNT}}"; do
    [[ -e "${old_archive}" ]] && rm -f -- "${old_archive}"
  done
done
