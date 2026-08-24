#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY_URL="https://github.com/montag-labs/HomeLab-Portal.git"
readonly REPOSITORY_BRANCH="main"
readonly APP_DIR="/opt/homelab-portal"
readonly SERVICE_NAME="homelab-portal"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly HOMELAB_PORT="${HOMELAB_PORT:-80}"
readonly HEALTH_URL="http://127.0.0.1:${HOMELAB_PORT}/api/config"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Dieses Script muss als root ausgeführt werden." >&2
  exit 1
fi

if [[ ! "${HOMELAB_PORT}" =~ ^[0-9]+$ ]] || (( HOMELAB_PORT < 1 || HOMELAB_PORT > 65535 )); then
  echo "HOMELAB_PORT muss eine Zahl zwischen 1 und 65535 sein." >&2
  exit 1
fi

if [[ -e "${APP_DIR}" ]]; then
  echo "Installationsverzeichnis existiert bereits: ${APP_DIR}" >&2
  echo "Die bestehende Installation wird nicht überschrieben." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Dieses Script unterstützt nur Debian- und Ubuntu-Systeme mit apt-get." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NPM_CONFIG_UPDATE_NOTIFIER=false

echo "Installiere Systempakete ..."
apt-get update
apt-get install -y ca-certificates curl git sudo

echo "Installiere Node.js LTS ..."
curl --fail --silent --show-error --location https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

node --version
npm --version

echo "Klone ${REPOSITORY_URL} ..."
install -d -m 755 /opt
git clone --depth 1 --branch "${REPOSITORY_BRANCH}" "${REPOSITORY_URL}" "${APP_DIR}"

cd "${APP_DIR}"
echo "Installiere Projektabhängigkeiten ..."
npm run install:all

echo "Erzeuge den Produktiv-Build ..."
npm run build

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=HomeLab Portal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=UPDATE_MODE=lxc
Environment=PORT=${HOMELAB_PORT}

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

for attempt in {1..10}; do
  if curl --fail --silent --show-error "${HEALTH_URL}" >/dev/null; then
    echo "HomeLab-Portal wurde erfolgreich installiert."
    echo "Portal: http://<CONTAINER-IP>:${HOMELAB_PORT}"
    exit 0
  fi
  sleep 1
done

echo "Der Service wurde gestartet, der Healthcheck ist jedoch fehlgeschlagen." >&2
systemctl --no-pager --full status "${SERVICE_NAME}" || true
exit 1
