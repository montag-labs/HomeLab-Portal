#!/usr/bin/env bash
# Gibt den Changelog-Abschnitt einer Version aus (ohne die Überschrift).
# Verwendung: scripts/release-notes.sh 1.7.0 [CHANGELOG.md]
set -Eeuo pipefail

version="${1:-}"
file="${2:-CHANGELOG.md}"
if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Verwendung: $0 X.Y.Z [CHANGELOG.md]" >&2
  exit 2
fi

notes="$(tr -d '\r' < "${file}" | awk -v heading="## [${version}]" '
  /^## \[/ {
    if (found) exit
    if (index($0, heading) == 1) found = 1
    next
  }
  found { print }
')"
# Leerzeilen am Anfang und Ende entfernen
notes="$(printf '%s\n' "${notes}" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}')"
if [[ -z "${notes//[[:space:]]/}" ]]; then
  echo "Kein Changelog-Eintrag für Version ${version} in ${file} gefunden." >&2
  exit 1
fi
printf '%s\n' "${notes}"
