<?php

namespace App\Support;

use App\Exceptions\SanitizationException;

class Sanitizer
{
    protected static array $sqlPatterns = [
        '/union\s+select/i',
        '/insert\s+into/i',
        '/delete\s+from/i',
        '/drop\s+table/i',
        '/\bexec\b/i',
        '/--/',
        '/\/\*/',
        '/;/',
        '/\bxp_/i',
        '/\bsp_/i',
    ];

    public static function sanitizeString($value, int $maxLength = 500): string
    {
        $value = (string) $value;

        // Supprime les balises HTML/XML (protection XSS)
        $value = strip_tags($value);

        // Supprime les caracteres de controle
        $value = preg_replace('/[\x00-\x1F\x7F-\x9F]/u', '', $value) ?? $value;

        $value = trim($value);

        if (mb_strlen($value) > $maxLength) {
            throw new SanitizationException("La valeur depasse la longueur maximale autorisee ({$maxLength} caracteres).");
        }

        foreach (self::$sqlPatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                throw new SanitizationException('Contenu suspect detecte dans la valeur fournie.');
            }
        }

        return $value;
    }

    public static function validateNumeric($value, ?float $min = null, ?float $max = null): float
    {
        if (! is_numeric($value)) {
            throw new SanitizationException('La valeur doit etre numerique.');
        }

        $value = (float) $value;

        if ($min !== null && $value < $min) {
            throw new SanitizationException("La valeur doit etre superieure ou egale a {$min}.");
        }

        if ($max !== null && $value > $max) {
            throw new SanitizationException("La valeur doit etre inferieure ou egale a {$max}.");
        }

        return $value;
    }

    public static function validateUuid($value): string
    {
        $value = (string) $value;

        if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
            throw new SanitizationException('Format UUID invalide.');
        }

        return $value;
    }

    public static function sanitizeInput(array $data, array $fieldValidators = []): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (mb_strlen((string) $key) > 100) {
                continue;
            }

            if (isset($fieldValidators[$key]) && is_callable($fieldValidators[$key])) {
                $result[$key] = $fieldValidators[$key]($value);
                continue;
            }

            if (is_string($value)) {
                $result[$key] = self::sanitizeString($value);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }
}
