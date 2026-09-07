<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Force les variables d'environnement du .env a prendre la priorite
// sur les variables systeme (ex: DB_PASSWORD systeme Windows).
putenv('DB_PASSWORD=');
putenv('DB_USER=');
putenv('DB_NAME=');

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());
