<?php

use App\Exceptions\SanitizationException;
use App\Http\Middleware\InputValidationMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Http\Middleware\EnsureIsAdmin;
use App\Http\Middleware\EnsureLabRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            InputValidationMiddleware::class,
        ]);

        // API-only app: never try to resolve a "login" web route when a
        // guard rejects a request (avoids a RouteNotFoundException masking
        // the clean 401 JSON response registered below).
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->append(SecurityHeadersMiddleware::class);

        $middleware->alias([
            'admin' => EnsureIsAdmin::class,
            'lab.role' => EnsureLabRole::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (SanitizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['detail' => $e->getMessage()], 400);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['detail' => 'Informations d\'authentification non fournies ou invalides.'], 401);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['detail' => 'Donnees invalides.', 'errors' => $e->errors()], 422);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['detail' => 'Ressource introuvable.'], 404);
            }
        });

        $exceptions->render(function (QueryException $e, Request $request) {
            if ($request->is('api/*') && in_array($e->getCode(), ['23000', '1451', '1452'], true)) {
                return response()->json([
                    'detail' => 'Cette action est impossible car la ressource est utilisee ailleurs (contrainte de cle etrangere).',
                ], 409);
            }
        });
    })->create();
