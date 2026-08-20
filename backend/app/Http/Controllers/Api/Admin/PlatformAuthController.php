<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use App\Support\LoginRateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Facades\JWTAuth;

class PlatformAuthController extends Controller
{
    public function login(Request $request)
    {
        $identifier = LoginRateLimiter::identifierFor($request);

        if (LoginRateLimiter::isLocked($identifier)) {
            $remaining = LoginRateLimiter::secondsRemaining($identifier);

            Log::channel('security')->warning("Platform admin login blocked (lockout active) for {$identifier}");

            return response()->json([
                'success' => false,
                'detail' => 'Trop de tentatives echouees. Reessayez plus tard.',
                'retry_after' => $remaining,
            ], 429);
        }

        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! $token = Auth::guard('platform')->attempt([
            'username' => $credentials['username'],
            'password' => $credentials['password'],
        ])) {
            LoginRateLimiter::hit($identifier);
            Log::channel('security')->warning("Failed platform admin login attempt for username '{$credentials['username']}' from {$identifier}");

            return response()->json([
                'success' => false,
                'detail' => "Nom d'utilisateur ou mot de passe incorrect.",
            ], 401);
        }

        $user = Auth::guard('platform')->user();

        if (! $user->is_active) {
            Auth::guard('platform')->logout();

            return response()->json([
                'success' => false,
                'detail' => 'Ce compte est desactive.',
            ], 401);
        }

        LoginRateLimiter::clear($identifier);

        $refresh = $this->issueRefreshToken($user);

        return response()->json([
            'success' => true,
            'user' => $user->toUserArray(),
            'access' => $token,
            'refresh' => $refresh,
        ]);
    }

    protected function issueRefreshToken($user): string
    {
        $originalTtl = JWTAuth::factory()->getTTL();
        JWTAuth::factory()->setTTL((int) config('jwt.refresh_ttl'));

        try {
            return JWTAuth::claims(['type' => 'refresh'])->fromUser($user);
        } finally {
            JWTAuth::factory()->setTTL($originalTtl);
        }
    }

    public function logout(Request $request)
    {
        $refresh = $request->input('refresh');

        if ($refresh) {
            try {
                JWTAuth::setToken($refresh)->invalidate();
            } catch (JWTException $e) {
                // token already invalid/expired: nothing to do
            }
        }

        try {
            if ($token = JWTAuth::getToken()) {
                JWTAuth::invalidate($token);
            }
        } catch (JWTException $e) {
            // ignore
        }

        return response()->json(['success' => true]);
    }

    public function check(Request $request)
    {
        return response()->json([
            'authenticated' => true,
            'user' => $request->user('platform')->toUserArray(),
        ]);
    }

    public function refresh(Request $request)
    {
        $request->validate([
            'refresh' => 'required|string',
        ]);

        try {
            $payload = JWTAuth::setToken($request->input('refresh'))->getPayload();
        } catch (TokenExpiredException $e) {
            return response()->json(['detail' => 'Le token de rafraichissement a expire.'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['detail' => 'Token de rafraichissement invalide.'], 401);
        } catch (JWTException $e) {
            return response()->json(['detail' => 'Impossible de rafraichir le token.'], 401);
        }

        if ($payload->get('type') !== 'refresh') {
            return response()->json(['detail' => 'Token fourni n\'est pas un token de rafraichissement.'], 401);
        }

        $user = PlatformAdmin::find($payload->get('sub'));

        if (! $user || ! $user->is_active) {
            return response()->json(['detail' => 'Utilisateur introuvable ou inactif.'], 401);
        }

        return response()->json(['access' => JWTAuth::fromUser($user)]);
    }
}
