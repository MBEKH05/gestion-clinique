FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
        libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libzip-dev libonig-dev libxml2-dev unzip git \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql gd zip bcmath opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini

# Le code (./backend) est monte en volume par docker-compose, pas copie ici :
# ca permet de reutiliser exactement la meme image pour "composer install"
# et pour servir l'app, sans avoir a reconstruire l'image a chaque deploiement.
WORKDIR /var/www/html

EXPOSE 9000
CMD ["php-fpm"]
