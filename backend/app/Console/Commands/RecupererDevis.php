<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Recupere les devis presents dans l'ancienne base (copie chargee dans une base
 * separee, par defaut "naby_ancienne") mais absents de la base actuelle.
 *
 * - Un devis deja present (meme numero ou meme identifiant) n'est jamais touche.
 * - Un devis qui a un "jumeau" dans la base actuelle (meme patient, meme jour,
 *   meme total) est considere comme refait : il n'est pas recupere.
 * - Les proformas sont ignores, sauf avec --avec-proformas.
 * - La prise en charge recuperee est celle du patient dans l'ancienne base
 *   (celle de l'epoque).
 *
 * Sans --appliquer, rien n'est modifie : aperçu + rapport CSV.
 */
class RecupererDevis extends Command
{
    protected $signature = 'devis:recuperer
        {--base=naby_ancienne : Base (sur le meme serveur MariaDB) contenant la copie de l\'ancienne base}
        {--avec-proformas : Recupere aussi les devis proforma}
        {--appliquer : Reinsere les devis (sinon simple aperçu)}';

    protected $description = "Reinsere les devis de l'ancienne base absents de la base actuelle (aperçu par defaut)";

    public function handle(): int
    {
        $base = (string) $this->option('base');
        if (! preg_match('/^[A-Za-z0-9_]+$/', $base)) {
            $this->error('Nom de base invalide.');

            return self::FAILURE;
        }

        $defaut = config('database.default');
        config(['database.connections.ancienne' => array_merge(config("database.connections.{$defaut}"), ['database' => $base])]);
        $ancienne = DB::connection('ancienne');

        try {
            $colonnesDevis = Schema::connection('ancienne')->getColumnListing('devis');
        } catch (\Throwable $e) {
            $this->error("Impossible de lire la base \"{$base}\" : ".$e->getMessage());

            return self::FAILURE;
        }
        if (! $colonnesDevis) {
            $this->error("La table devis est introuvable dans la base \"{$base}\".");

            return self::FAILURE;
        }

        // --- Ce qui existe deja dans la base actuelle ---
        $numerosActuels = DB::table('devis')->pluck('numero')->flip();
        $idsActuels = DB::table('devis')->pluck('id')->flip();
        $jumeaux = DB::table('devis')
            ->selectRaw("CONCAT(patient_id, '|', DATE(date_creation), '|', ROUND(total)) AS cle")
            ->pluck('cle')->flip();
        $patientsActuels = DB::table('patients')->pluck('nom_complet', 'id');
        $analysesActuelles = DB::table('analyses')->pluck('id')->flip();
        $ipmsActuelles = DB::table('ipms')->pluck('nom', 'id');
        $assurancesActuelles = DB::table('assurances')->pluck('nom', 'id');
        $lignesIdsActuelles = DB::table('devis_lignes')->pluck('id')->flip();

        // --- Devis de l'ancienne base absents de l'actuelle ---
        $anciens = $ancienne->table('devis')->orderBy('date_creation')->get()
            ->filter(fn ($d) => ! isset($numerosActuels[$d->numero]) && ! isset($idsActuels[$d->id]));

        $patientsAnciens = $ancienne->table('patients')
            ->whereIn('id', $anciens->pluck('patient_id')->unique()->values())
            ->get(['id', 'nom_complet', 'type_prise_en_charge', 'ipm_id', 'assurance_id'])
            ->keyBy('id');
        $lignesAnciennes = $anciens->isEmpty() ? collect() : $ancienne->table('devis_lignes')
            ->whereIn('devis_id', $anciens->pluck('id')->values())
            ->get()->groupBy('devis_id');

        $compte = ['a_recuperer' => 0, 'jumeau' => 0, 'proforma' => 0, 'patient_absent' => 0, 'analyse_absente' => 0, 'sans_ligne' => 0];
        $aInserer = [];
        $rapport = [];

        foreach ($anciens as $d) {
            $patient = $patientsAnciens[$d->patient_id] ?? null;
            $lignes = $lignesAnciennes[$d->id] ?? collect();
            $cle = $d->patient_id.'|'.substr((string) $d->date_creation, 0, 10).'|'.round((float) $d->total);
            $pec = $this->priseEnCharge($patient, $ipmsActuelles, $assurancesActuelles);

            $statut = match (true) {
                (bool) $d->is_proforma && ! $this->option('avec-proformas') => 'proforma',
                isset($jumeaux[$cle]) => 'jumeau',
                ! isset($patientsActuels[$d->patient_id]) => 'patient_absent',
                $lignes->isEmpty() => 'sans_ligne',
                $lignes->contains(fn ($l) => ! isset($analysesActuelles[$l->analyse_id])) => 'analyse_absente',
                default => 'a_recuperer',
            };
            $compte[$statut]++;

            $taux = is_numeric($d->taux_couverture) ? (float) $d->taux_couverture : 0.0;
            $rapport[] = [
                match ($statut) {
                    'a_recuperer' => 'A RECUPERER',
                    'jumeau' => 'IGNORE - deja refait (meme patient, jour, total)',
                    'proforma' => 'IGNORE - proforma',
                    'patient_absent' => 'IGNORE - patient absent de la base actuelle',
                    'sans_ligne' => 'IGNORE - aucune ligne',
                    'analyse_absente' => 'IGNORE - analyse supprimee depuis',
                },
                $d->numero,
                substr((string) $d->date_creation, 0, 10),
                $patientsActuels[$d->patient_id] ?? $patient?->nom_complet,
                $pec['libelle'],
                round((float) $d->total),
                $d->taux_couverture,
                round((float) $d->total * (1 - $taux / 100)),
                $d->statut_paiement ?? '',
                $lignes->count(),
            ];

            if ($statut === 'a_recuperer') {
                $aInserer[] = ['devis' => $d, 'lignes' => $lignes, 'pec' => $pec];
            }
        }

        $fichier = storage_path('app/recuperation-devis-'.now()->format('Ymd-His').'.csv');
        $this->ecrireCsv($fichier, $rapport);

        $this->info("Devis presents dans \"{$base}\" mais absents de la base actuelle : ".$anciens->count());
        $this->table(['Resultat', 'Devis'], [
            ['A recuperer', $compte['a_recuperer']],
            ['Ignores : deja refaits (jumeau)', $compte['jumeau']],
            ['Ignores : proformas'.($this->option('avec-proformas') ? '' : ' (--avec-proformas pour les inclure)'), $compte['proforma']],
            ['Ignores : patient absent de la base actuelle', $compte['patient_absent']],
            ['Ignores : analyse supprimee depuis', $compte['analyse_absente']],
            ['Ignores : aucune ligne', $compte['sans_ligne']],
        ]);

        $this->recapitulatif($aInserer);
        $this->line("Rapport detaille : {$fichier}");

        if (! $this->option('appliquer')) {
            $this->warn('Aucune modification faite. Relancez avec --appliquer pour reinserer les devis "A RECUPERER".');

            return self::SUCCESS;
        }
        if (! $aInserer) {
            $this->info('Rien a reinserer.');

            return self::SUCCESS;
        }

        $colonnesActuelles = array_flip(Schema::getColumnListing('devis'));
        DB::transaction(function () use ($aInserer, $colonnesActuelles, $lignesIdsActuelles) {
            foreach ($aInserer as ['devis' => $d, 'lignes' => $lignes, 'pec' => $pec]) {
                $ligne = array_intersect_key((array) $d, $colonnesActuelles);
                $ligne = array_merge($ligne, [
                    'type_prise_en_charge' => $pec['type'],
                    'ipm_id' => $pec['ipm_id'],
                    'assurance_id' => $pec['assurance_id'],
                ]);
                if (array_key_exists('created_by', $ligne) && $ligne['created_by'] !== null
                    && ! DB::table('users')->where('id', $ligne['created_by'])->exists()) {
                    $ligne['created_by'] = null;
                }
                DB::table('devis')->insert($ligne);

                foreach ($lignes as $l) {
                    DB::table('devis_lignes')->insert([
                        'id' => isset($lignesIdsActuelles[$l->id]) ? (string) Str::uuid() : $l->id,
                        'devis_id' => $d->id,
                        'analyse_id' => $l->analyse_id,
                        'prix' => $l->prix,
                        'quantite' => $l->quantite ?? 1,
                    ]);
                }
            }
        });

        $this->info(count($aInserer).' devis reinseres avec leurs lignes.');

        return self::SUCCESS;
    }

    /** Prise en charge du patient dans l'ancienne base (verifiee contre les IPM / assurances actuelles). */
    private function priseEnCharge(?object $patient, Collection $ipms, Collection $assurances): array
    {
        $type = $patient?->type_prise_en_charge;
        $ipm = $type === 'IPM' && isset($ipms[$patient->ipm_id]) ? $patient->ipm_id : null;
        $assurance = $type === 'ASSURANCE' && isset($assurances[$patient->assurance_id]) ? $patient->assurance_id : null;

        return [
            'type' => $type,
            'ipm_id' => $ipm,
            'assurance_id' => $assurance,
            'libelle' => match ($type) {
                'IPM' => $ipm ? 'IPM : '.$ipms[$ipm] : 'IPM inconnue',
                'ASSURANCE' => $assurance ? 'Assurance : '.$assurances[$assurance] : 'Assurance inconnue',
                'CAISSE' => 'Caisse',
                default => 'Non renseignee',
            },
        ];
    }

    /** Montant pris en charge recupere, par mois et par payeur. */
    private function recapitulatif(array $aInserer): void
    {
        if (! $aInserer) {
            return;
        }
        $lignes = collect($aInserer)
            ->groupBy(fn ($x) => substr((string) $x['devis']->date_creation, 0, 7).'|'.$x['pec']['libelle'])
            ->map(function ($groupe, $cle) {
                [$mois, $payeur] = explode('|', $cle, 2);
                $part = $groupe->sum(function ($x) {
                    $taux = is_numeric($x['devis']->taux_couverture) ? (float) $x['devis']->taux_couverture : 0.0;

                    return (float) $x['devis']->total * (1 - $taux / 100);
                });

                return [$mois, $payeur, $groupe->count(), number_format($part, 0, ',', ' ')];
            })
            ->sortBy(fn ($l) => $l[0].$l[1])
            ->values()
            ->all();

        $this->info('Detail de ce qui serait recupere (part prise en charge) :');
        $this->table(['Mois', 'Payeur', 'Devis', 'Part prise en charge'], $lignes);
    }

    private function ecrireCsv(string $fichier, array $lignes): void
    {
        $f = fopen($fichier, 'w');
        fwrite($f, "\xEF\xBB\xBF");
        fputcsv($f, ['Resultat', 'Numero', 'Date', 'Patient', 'Prise en charge (epoque)', 'Total', 'Taux patient (%)', 'Part prise en charge', 'Statut paiement', 'Lignes'], ';');
        foreach ($lignes as $ligne) {
            fputcsv($f, $ligne, ';');
        }
        fclose($f);
    }
}
