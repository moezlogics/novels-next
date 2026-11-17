#!/usr/bin/env bash
# ==============================================================================
# Kitab Nagri — Live Server MongoDB Setup (Auth OFF → Create DB/User → Auth ON)
# Run as root on the live server:
#   sudo bash scripts/setup-live-mongo.sh
# ==============================================================================
set -euo pipefail

DB_NAME="novels"
DB_USER="kitabnagri_user"
DB_PASS="KnMongo2026Secure99x"
ADMIN_USER="kn_root_admin"
ADMIN_PASS="KnRootAdmin2026Secure99x"
CONF="/etc/mongod.conf"

echo "1/4 Temporarily disabling MongoDB authorization in ${CONF} …"
cp "${CONF}" "${CONF}.bak.$(date +%s)"
# Remove any existing security block so mongod starts without auth
sed -i '/^security:/,/^[^ ]/{/^security:/d;/^  authorization:/d}' "${CONF}"
systemctl restart mongod
sleep 2

echo "2/4 Creating admin user and '${DB_NAME}' database user …"
mongosh --quiet <<EOF
use admin
try {
  db.createUser({
    user: "${ADMIN_USER}",
    pwd: "${ADMIN_PASS}",
    roles: [{ role: "root", db: "admin" }]
  })
} catch (e) {
  db.changeUserPassword("${ADMIN_USER}", "${ADMIN_PASS}")
}

use ${DB_NAME}
try {
  db.createUser({
    user: "${DB_USER}",
    pwd: "${DB_PASS}",
    roles: [{ role: "readWrite", db: "${DB_NAME}" }, { role: "dbAdmin", db: "${DB_NAME}" }]
  })
} catch (e) {
  db.changeUserPassword("${DB_USER}", "${DB_PASS}")
}
EOF

echo "3/4 Enabling MongoDB authorization in ${CONF} …"
cat >> "${CONF}" <<'EOF'

security:
  authorization: enabled
EOF

echo "4/4 Restarting MongoDB with authorization enabled …"
systemctl restart mongod
sleep 2

echo "Testing authenticated connection …"
mongosh "mongodb://${DB_USER}:${DB_PASS}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}" --quiet --eval "db.runCommand({ ping: 1 })"

echo ""
echo "✅ MongoDB is ready and secured!"
echo "MONGODB_URI=mongodb://${DB_USER}:${DB_PASS}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}"
echo "MONGODB_DB=${DB_NAME}"
