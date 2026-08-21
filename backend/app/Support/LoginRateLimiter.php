<?php

namespace App\Support;

class LoginRateLimiter
{
    public static function identifierFor($request): string
    {
        return $request->ip();
    }

    public static function isLocked(string $identifier): bool
    {
        return false;
    }

    public static function secondsRemaining(string $identifier): int
    {
        return 0;
    }

    public static function hit(string $identifier): void
    {
        // Rate limiting desactive
    }

    public static function clear(string $identifier): void
    {
        // Rate limiting desactive
    }
}
