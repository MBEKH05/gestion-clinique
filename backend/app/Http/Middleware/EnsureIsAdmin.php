<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_superuser) {
            return response()->json([
                'detail' => 'Vous devez etre administrateur pour effectuer cette action.',
            ], 403);
        }

        return $next($request);
    }
}
