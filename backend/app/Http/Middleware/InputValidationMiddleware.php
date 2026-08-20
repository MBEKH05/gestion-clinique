<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InputValidationMiddleware
{
    protected const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/*')) {
            $contentLength = (int) $request->header('Content-Length', 0);

            if ($contentLength > self::MAX_REQUEST_SIZE) {
                return response()->json([
                    'detail' => 'La requete depasse la taille maximale autorisee (10MB).',
                ], 413);
            }

            $content = $request->getContent();

            if ($content !== '' && str_contains((string) $request->header('Content-Type'), 'application/json')) {
                json_decode($content);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    return response()->json([
                        'detail' => 'Corps de requete JSON invalide.',
                    ], 400);
                }
            }
        }

        return $next($request);
    }
}
