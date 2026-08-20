# Deploiement sur Hostinger (Docker + Nginx)

Architecture : 4 conteneurs (`app` = Laravel/PHP-FPM, `nginx`, `db` =
MariaDB, `adminer`), plus un conteneur `frontend-build` qui ne fait que
generer les fichiers statiques React (il ne tourne pas en continu) et un
conteneur `certbot` pour le renouvellement HTTPS automatique.

- Port **7777** -> Frontend (React)
- Port **7778** -> Backend API (Laravel)
- Port **7779** -> Adminer (administration de la base de donnees)
- Port **80** -> uniquement pour la validation Let's Encrypt + redirection

Domaine cible : `gestionclinique.cliniquenaby.com`

## 0. Prerequis sur le serveur Hostinger

- Un VPS Hostinger (le Docker n'est pas disponible sur l'hebergement
  mutualise classique).
- Docker + Docker Compose installes :
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo apt-get install -y docker-compose-plugin
  ```
- Un enregistrement DNS **A** pour `gestionclinique.cliniquenaby.com`
  pointant vers l'IP du VPS (a faire cote registrar/Hostinger, propagation
  parfois jusqu'a quelques heures).
- Ports ouverts dans le pare-feu du VPS : `80`, `7777`, `7778`, `7779`.

## 1. Transferer le projet sur le serveur

Depuis ce PC (ou via git si le depot est pousse sur un remote) :
```bash
rsync -avz --exclude 'node_modules' --exclude 'vendor' --exclude '.git' \
  "GESTION CLINIQUE NABY/" user@IP_SERVEUR:/opt/clinique-naby/
```
(Adapter l'utilisateur/IP. `vendor/` et `node_modules/` sont exclus : ils
seront regeneres dans les conteneurs a l'etape 3.)

## 2. Configurer les variables d'environnement

Sur le serveur, dans `/opt/clinique-naby/` :

```bash
cp .env.docker.example .env
cp backend/.env.production.example backend/.env
```

Editer `.env` (racine) :
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` : choisir des mots de passe forts.
- `REACT_APP_API_BASE_URL=http://gestionclinique.cliniquenaby.com:7778/api`
  pour l'instant (on passera en `https://` a l'etape 6).
- `NGINX_CONF=nginx.http.conf` (valeur par defaut, ne pas toucher pour
  l'instant).

Editer `backend/.env` :
- `DB_PASSWORD` : **la meme valeur** que dans `.env` (racine).
- `APP_URL=http://gestionclinique.cliniquenaby.com:7778` pour l'instant.
- `CORS_ALLOWED_ORIGINS=http://gestionclinique.cliniquenaby.com:7777` pour
  l'instant.
- `APP_KEY` et `JWT_SECRET` : laisser vide, generes a l'etape 3.

## 3. Construire et demarrer

```bash
cd /opt/clinique-naby
docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm app composer install --no-dev --optimize-autoloader
docker compose -f docker-compose.prod.yml run --rm app php artisan key:generate --force
docker compose -f docker-compose.prod.yml run --rm app php artisan jwt:secret --force
docker compose -f docker-compose.prod.yml run --rm app php artisan migrate --force
docker compose -f docker-compose.prod.yml run --rm app php artisan storage:link

docker compose -f docker-compose.prod.yml run --rm frontend-build

docker compose -f docker-compose.prod.yml up -d
```

Verifier que tout tourne :
```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://gestionclinique.cliniquenaby.com:7777
curl -I http://gestionclinique.cliniquenaby.com:7778/api/dashboard-stats
```

## 4. (Optionnel mais recommande) Importer les donnees existantes

Si une base de donnees existante doit etre reprise (ex. l'export
`facturation_clinique.sql` mentionne precedemment) :
```bash
docker compose -f docker-compose.prod.yml exec -T db \
  mariadb -u root -p"$DB_ROOT_PASSWORD" facturation_clinique < mon_export.sql
```

## 5. Obtenir le certificat HTTPS (Let's Encrypt)

Le port 80 doit deja repondre (bootstrap OK a l'etape 3) et le DNS doit
avoir propage avant cette etape.

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d gestionclinique.cliniquenaby.com \
  --email TON_EMAIL --agree-tos --no-eff-email" certbot
```

## 6. Basculer en HTTPS

Editer `.env` (racine) :
```
NGINX_CONF=nginx.ssl.conf
REACT_APP_API_BASE_URL=https://gestionclinique.cliniquenaby.com:7778/api
```

Editer `backend/.env` :
```
APP_URL=https://gestionclinique.cliniquenaby.com:7778
CORS_ALLOWED_ORIGINS=https://gestionclinique.cliniquenaby.com:7777
```

Reconstruire le frontend (l'URL API est figee au moment du build) et
relancer nginx :
```bash
docker compose -f docker-compose.prod.yml run --rm frontend-build
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

Le conteneur `certbot` renouvelle automatiquement le certificat tous les
12h (`certbot renew`), sans action a refaire.

## 7. Mise a jour de l'application (deploiements suivants)

```bash
cd /opt/clinique-naby
git pull   # ou rsync depuis le poste de dev
docker compose -f docker-compose.prod.yml run --rm app composer install --no-dev --optimize-autoloader
docker compose -f docker-compose.prod.yml run --rm app php artisan migrate --force
docker compose -f docker-compose.prod.yml run --rm frontend-build
docker compose -f docker-compose.prod.yml restart app nginx
```

## Notes de securite

- **Adminer (port 7779)** donne acces a toute la base de donnees. Une fois
  la mise en route terminee, restreindre l'acces (pare-feu VPS limite a
  ton IP, ou commenter le service `adminer` dans `docker-compose.prod.yml`
  et ne le relancer qu'a la demande via
  `docker compose -f docker-compose.prod.yml up -d adminer`).
- `backend/.env` et `.env` (racine) contiennent des secrets : ne jamais les
  committer dans un depot public.
- Penser a des sauvegardes regulieres du volume `db_data` (ex.
  `docker compose exec db mariadb-dump -u root -p"$DB_ROOT_PASSWORD" facturation_clinique > backup.sql`
  via une tache cron).
