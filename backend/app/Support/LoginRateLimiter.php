<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LoginRateLimiter
{
    protected const MAX_ATTEMPTS = 5;

    protected const WINDOW_SECONDS = 300; // 5 minutes

    protected const LOCKOUT_SECONDS = 900; // 15 minutes

    public static function identifierFor($request): string
    {
        $forwarded = $request->header('X-Forwarded-For');

        if ($forwarded) {
            return trim(explode(',', $forwarded)[0]);
        }

        return $request->ip();
    }

    public static function isLocked(string $identifier): bool
    {
        return Cache::has(self::lockKey($identifier));
    }

    public static function secondsRemaining(string $identifier): int
    {
        $lockedUntil = Cache::get(self::lockKey($identifier));

        if (! $lockedUntil) {
            return 0;
        }

        return max(0, $lockedUntil - time());
    }

    public static function hit(string $identifier): void
    {
        $key = self::attemptsKey($identifier);
        $attempts = Cache::get($key, 0) + 1;

        Cache::put($key, $attempts, self::WINDOW_SECONDS);

        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::put(self::lockKey($identifier), time() + self::LOCKOUT_SECONDS, self::LOCKOUT_SECONDS);
            Log::channel('security')->warning("Brute-force protection: lockout triggered for {$identifier}");
        }
    }

    public static function clear(string $identifier): void
    {
        Cache::forget(self::attemptsKey($identifier));
        Cache::forget(self::lockKey($identifier));
    }

    protected static function attemptsKey(string $identifier): string
    {
        return "login_attempts:{$identifier}";
    }

    protected static function lockKey(string $identifier): string
    {
        return "login_lockout:{$identifier}";
    }
}
