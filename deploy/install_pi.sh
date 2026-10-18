#!/usr/bin/env bash
# OpthaEdge - one-shot installer for Raspberry Pi 4 (64-bit Raspberry Pi OS, Bookworm).
#
# Installs PostgreSQL, Node.js 22, the Python inference service (with picamera2)
# and the web platform, generates secrets, builds, migrates, seeds the first
# administrator and enables both systemd services.
#
#   git clone <repo> ~/opthaedge && cd ~/opthaedge
#   sudo ./deploy/install_pi.sh
#
# Re-running is safe: secrets and the database are kept; code is rebuilt.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run with sudo: sudo ./deploy/install_pi.sh" >&2; exit 1; fi
if [[ "$(uname -m)" != "aarch64" ]]; then
  echo "64-bit Raspberry Pi OS is required (uname -m must print aarch64); ONNX Runtime has no 32-bit wheel." >&2
  exit 1
fi

APP_USER="${SUDO_USER:-pi}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF_DIR=/etc/opthaedge
DATA_DIR=/var/lib/opthaedge
VENV=/opt/opthaedge/venv
run_as_app() { sudo -u "$APP_USER" -H bash -c "$1"; }

echo "==> Installing system packages"
apt-get update
apt-get install -y postgresql python3-venv python3-picamera2 python3-libcamera libcamera-apps \
  ca-certificates curl git openssl
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Secrets and configuration ($CONF_DIR)"
install -d -m 750 -o root -g "$APP_USER" "$CONF_DIR"
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$DATA_DIR" "$DATA_DIR/storage"
rand() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-"$1"; }
if [[ ! -f "$CONF_DIR/opthaedge.env" ]]; then
  DB_PASSWORD="$(rand 32)"
  INFERENCE_KEY="$(rand 40)"
  cat > "$CONF_DIR/opthaedge.env" <<EOF
DATABASE_URL="postgresql://opthaedge:${DB_PASSWORD}@127.0.0.1:5432/opthaedge?schema=public"
SESSION_SECRET="$(rand 48)"
SESSION_COOKIE_SECURE="false"
IMAGE_ENCRYPTION_KEY="$(rand 48)"
STORAGE_DIR="$DATA_DIR/storage"
INFERENCE_URL="http://127.0.0.1:8001"
INFERENCE_API_KEY="${INFERENCE_KEY}"
ANTHROPIC_API_KEY=""
LLM_MODEL=""
PUBLIC_BASE_URL=""
ORGANIZATION_NAME="OpthaEdge Screening Clinic"
EOF
  cat > "$CONF_DIR/inference.env" <<EOF
MODEL_PATH="$APP_DIR/edge/models/student_int8.onnx"
THREADS="4"
INFERENCE_API_KEY="${INFERENCE_KEY}"
CAMERA="auto"
# 20D indirect ophthalmoscopy gives an inverted image: set "both" to rotate 180 degrees.
CAMERA_FLIP="none"
BLUR_MIN="30"
BRIGHT_MIN="25"
BRIGHT_MAX="220"
EOF
  echo "    Generated new secrets. BACK UP $CONF_DIR/opthaedge.env - losing IMAGE_ENCRYPTION_KEY makes stored images unreadable."
else
  echo "    Keeping existing $CONF_DIR/opthaedge.env"
fi
chown root:"$APP_USER" "$CONF_DIR"/*.env
chmod 640 "$CONF_DIR"/*.env

echo "==> PostgreSQL database"
set -a; source "$CONF_DIR/opthaedge.env"; set +a
DB_PASSWORD="$(echo "$DATABASE_URL" | sed -E 's#postgresql://[^:]+:([^@]+)@.*#\1#')"
if ! sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='opthaedge'" | grep -q 1; then
  sudo -u postgres psql -c "create role opthaedge login password '${DB_PASSWORD}'"
fi
if ! sudo -u postgres psql -tAc "select 1 from pg_database where datname='opthaedge'" | grep -q 1; then
  sudo -u postgres createdb -O opthaedge opthaedge
fi

echo "==> Python inference service"
if [[ ! -d "$VENV" ]]; then
  install -d -o "$APP_USER" -g "$APP_USER" /opt/opthaedge
  run_as_app "python3 -m venv --system-site-packages $VENV"
fi
run_as_app "$VENV/bin/pip install --upgrade pip && $VENV/bin/pip install -r '$APP_DIR/edge/requirements.txt'"
usermod -aG video "$APP_USER"

echo "==> Web platform (npm ci, migrate, build - the build takes several minutes on a Pi 4)"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
ENV_EXPORT="set -a; source $CONF_DIR/opthaedge.env; set +a"
run_as_app "cd '$APP_DIR' && $ENV_EXPORT && npm ci && npx prisma migrate deploy"
run_as_app "cd '$APP_DIR' && $ENV_EXPORT && NODE_OPTIONS=--max-old-space-size=2048 npm run build"

if ! sudo -u postgres psql -d opthaedge -tAc "select 1 from users where \"passwordHash\" is not null limit 1" 2>/dev/null | grep -q 1; then
  echo "==> Create the first administrator account"
  read -rp "    Administrator email: " ADMIN_EMAIL
  read -rp "    Administrator name: " ADMIN_NAME
  while true; do
    read -rsp "    Password (10+ chars, letters and numbers): " ADMIN_PASSWORD; echo
    [[ ${#ADMIN_PASSWORD} -ge 10 ]] && break
  done
  # Passed through the environment so quotes in the password are safe.
  sudo -u "$APP_USER" -H env SEED_ADMIN_EMAIL="$ADMIN_EMAIL" SEED_ADMIN_NAME="$ADMIN_NAME" SEED_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    bash -c "cd '$APP_DIR' && $ENV_EXPORT && npx prisma db seed"
  unset ADMIN_PASSWORD
else
  run_as_app "cd '$APP_DIR' && $ENV_EXPORT && npx prisma db seed"
fi

echo "==> systemd services"
for unit in opthaedge-inference opthaedge-web; do
  sed -e "s#__APP_USER__#$APP_USER#g" -e "s#__APP_DIR__#$APP_DIR#g" "$APP_DIR/deploy/systemd/$unit.service" > "/etc/systemd/system/$unit.service"
done
systemctl daemon-reload
systemctl enable --now opthaedge-inference opthaedge-web
systemctl restart opthaedge-inference opthaedge-web

sleep 5
echo
curl -fsS http://127.0.0.1:8001/health && echo || echo "Inference service not answering yet: journalctl -u opthaedge-inference -n 50"
IP="$(hostname -I | awk '{print $1}')"
cat <<EOF

OpthaEdge is running.
  On a phone on the same Wi-Fi, open:  http://${IP}:3000   (or http://$(hostname).local:3000)
  Then use "Add to Home screen" to install it as an app.

  Logs:      journalctl -u opthaedge-web -u opthaedge-inference -f
  Config:    $CONF_DIR/opthaedge.env (add ANTHROPIC_API_KEY for AI patient education)
             $CONF_DIR/inference.env (model, camera flip, quality thresholds)
  After editing config:  sudo systemctl restart opthaedge-web opthaedge-inference
EOF
