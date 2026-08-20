<?php

namespace App\Support;

class FactureNumero
{
    public static function generate(int $mois, int $annee, string $entiteId): string
    {
        $hash = strtoupper(substr(md5($entiteId), 0, 3));

        return sprintf('FACT-%04d-%02d-%s', $annee, $mois, $hash);
    }
}
