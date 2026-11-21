<?php

namespace App\Console\Commands;

use App\Support\VerrouFactures;
use Illuminate\Console\Command;

/** Definit (ou change) le code a 4 chiffres des factures mensuelles. Il est stocke chiffre. */
class CodeFactures extends Command
{
    protected $signature = 'factures:code';

    protected $description = "Definit le code a 4 chiffres qui deverrouille les factures mensuelles apres le 5 du mois";

    public function handle(): int
    {
        $code = (string) $this->secret('Nouveau code (4 chiffres)');
        if (! preg_match('/^\d{4}$/', $code)) {
            $this->error('Le code doit contenir exactement 4 chiffres.');

            return self::FAILURE;
        }
        if ((string) $this->secret('Confirmez le code') !== $code) {
            $this->error('Les deux codes ne correspondent pas.');

            return self::FAILURE;
        }

        VerrouFactures::definirCode($code);
        $this->info('Code des factures mensuelles enregistre (chiffre).');

        return self::SUCCESS;
    }
}
