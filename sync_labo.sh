#!/bin/bash
set -e

cd /root/gestion-clinique

SRC_CONTAINER="labo-db-1"
SRC_PASS="Momar&omar@akoadigital2025"
SRC_DB="labo"

DST_PASS=$(grep DB_ROOT_PASSWORD .env | cut -d= -f2)
DST_DB="facturation_clinique"

TMPFILE="/tmp/sync_labo_$(date +%s).sql"

docker exec "$SRC_CONTAINER" mysqldump -u root -p"$SRC_PASS" \
  --no-tablespaces --single-transaction \
  "$SRC_DB" labo_app_user labo_app_dossier labo_app_documenthospitalisation \
  > "$TMPFILE"

sed -i \
  -e 's/`labo_app_user`/`tmp_labo_user`/g' \
  -e 's/`labo_app_dossier`/`tmp_labo_dossier`/g' \
  -e 's/`labo_app_documenthospitalisation`/`tmp_labo_doc`/g' \
  "$TMPFILE"

docker compose -f docker-compose.prod.yml exec -T db \
  mariadb -u root -p"$DST_PASS" "$DST_DB" -e "
    SET FOREIGN_KEY_CHECKS=0;
    DROP TABLE IF EXISTS tmp_labo_doc, tmp_labo_dossier, tmp_labo_user;
    DELETE FROM lab_documents;
    DELETE FROM lab_dossiers;
    DELETE FROM lab_users;
    SET FOREIGN_KEY_CHECKS=1;
  "

docker compose -f docker-compose.prod.yml exec -T db \
  mariadb -u root -p"$DST_PASS" "$DST_DB" < "$TMPFILE"

rm -f "$TMPFILE"

rm -rf ~/gestion-clinique/backend/storage/app/public/lab-documents-import
mkdir -p ~/gestion-clinique/backend/storage/app/public/lab-documents-import
cp -r /var/lib/docker/volumes/labo_media_data/_data/pdfs/originaux ~/gestion-clinique/backend/storage/app/public/lab-documents-import/
cp -r /var/lib/docker/volumes/labo_media_data/_data/pdfs/signes ~/gestion-clinique/backend/storage/app/public/lab-documents-import/

rm -rf ~/gestion-clinique/backend/storage/app/public/lab-documents
docker compose -f docker-compose.prod.yml exec app php artisan tinker migrate_labo.php

echo "$(date): Synchronisation labo terminee" >> /root/gestion-clinique/sync_labo.log
