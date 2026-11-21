<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Verrou des factures mensuelles : du 1er au 5 du mois, acces libre (periode
 * de facturation du mois precedent) ; a partir du 6, il faut saisir le code a
 * 4 chiffres. Le code est stocke chiffre dans la table parametres
 * (php artisan factures:code). Un code correct ouvre l'acces 30 minutes pour
 * le compte ; 5 codes faux bloquent le compte 15 minutes.
 */
class VerrouFactures
{
    public const JOUR_LIMITE = 5;

    public const DUREE_ACCES_MINUTES = 30;

    public const ESSAIS_MAX = 5;

    public const BLOCAGE_MINUTES = 15;

    private const CLE_CODE = 'factures_mensuelles_code';

    public static function periodeLibre(): bool
    {
        return now()->day <= self::JOUR_LIMITE;
    }

    public static function codeConfigure(): bool
    {
        return (bool) DB::table('parametres')->where('cle', self::CLE_CODE)->value('valeur');
    }

    public static function definirCode(string $code): void
    {
        DB::table('parametres')->updateOrInsert(
            ['cle' => self::CLE_CODE],
            ['valeur' => Hash::make($code), 'updated_at' => now()]
        );
    }

    public static function accesAutorise(?int $userId): bool
    {
        return self::periodeLibre() || ($userId && Cache::has(self::cleAcces($userId)));
    }

    public static function secondesRestantes(int $userId): int
    {
        $expire = Cache::get(self::cleAcces($userId));

        return $expire ? max(0, $expire - time()) : 0;
    }

    public static function bloqueDepuis(int $userId): int
    {
        $jusqua = Cache::get(self::cleBlocage($userId));

        return $jusqua ? max(0, $jusqua - time()) : 0;
    }

    /** @return array{ok: bool, essaisRestants?: int, bloqueSecondes?: int} */
    public static function verifier(int $userId, string $code): array
    {
        if ($secondes = self::bloqueDepuis($userId)) {
            return ['ok' => false, 'bloqueSecondes' => $secondes];
        }

        $hash = DB::table('parametres')->where('cle', self::CLE_CODE)->value('valeur');
        if ($hash && Hash::check($code, $hash)) {
            Cache::forget(self::cleEssais($userId));
            $expire = time() + self::DUREE_ACCES_MINUTES * 60;
            Cache::put(self::cleAcces($userId), $expire, now()->addMinutes(self::DUREE_ACCES_MINUTES));

            return ['ok' => true];
        }

        $essais = (int) Cache::get(self::cleEssais($userId), 0) + 1;
        if ($essais >= self::ESSAIS_MAX) {
            Cache::forget(self::cleEssais($userId));
            Cache::put(self::cleBlocage($userId), time() + self::BLOCAGE_MINUTES * 60, now()->addMinutes(self::BLOCAGE_MINUTES));

            return ['ok' => false, 'bloqueSecondes' => self::BLOCAGE_MINUTES * 60];
        }
        Cache::put(self::cleEssais($userId), $essais, now()->addMinutes(self::BLOCAGE_MINUTES));

        return ['ok' => false, 'essaisRestants' => self::ESSAIS_MAX - $essais];
    }

    public static function verrouiller(int $userId): void
    {
        Cache::forget(self::cleAcces($userId));
    }

    private static function cleAcces(int $userId): string
    {
        return "factures_acces_{$userId}";
    }

    private static function cleEssais(int $userId): string
    {
        return "factures_essais_{$userId}";
    }

    private static function cleBlocage(int $userId): string
    {
        return "factures_blocage_{$userId}";
    }
}
