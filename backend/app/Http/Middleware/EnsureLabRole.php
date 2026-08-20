<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLabRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user('lab');

        if (! $user || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'detail' => "Vous n'avez pas les droits necessaires pour effectuer cette action.",
            ], 403);
        }

        return $next($request);
    }
}
