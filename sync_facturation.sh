#!/bin/bash
set -e

cd /root/gestion-clinique

SRC_CONTAINER="naby_mysql"
SRC_PASS="p@ssword123"
SRC_DB="facturation_clinique"

DST_PASS=$(grep DB_ROOT_PASSWORD .env | cut -d= -f2)
DST_DB="facturation_clinique"

TABLES="patients devis devis_lignes analyses assurances categories tarifs ipms"

TMPFILE="/tmp/sync_facturation_$(date +%s).sql"

docker exec "$SRC_CONTAINER" mysqldump -u root -p"$SRC_PASS" \
  --no-tablespaces --single-transaction \
  "$SRC_DB" $TABLES > "$TMPFILE"

# Corriger la collation MySQL8 -> MariaDB
sed -i 's/utf8mb4_0900_ai_ci/utf8mb4_unicode_ci/g' "$TMPFILE"

docker compose -f docker-compose.prod.yml exec -T db \
  mariadb -u root -p"$DST_PASS" "$DST_DB" < "$TMPFILE"

rm -f "$TMPFILE"

echo "$(date): Synchronisation facturation terminee" >> /root/gestion-clinique/sync_facturation.log
