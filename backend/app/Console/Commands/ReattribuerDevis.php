<?php

namespace App\Console\Commands;

use App\Models\Assurance;
use App\Models\Devis;
use App\Models\Ipm;
use App\Models\Tarif;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Retrouve la prise en charge d'origine des anciens devis grace aux tarifs.
 *
 * Avant que la prise en charge soit enregistree sur chaque devis, les factures
 * mensuelles suivaient la fiche ACTUELLE du patient : un patient qui changeait
 * d'IPM, d'assurance ou passait en Caisse emportait ses anciens devis. Les prix
 * des lignes d'un devis correspondent aux tarifs de son payeur d'origine : si
 * un seul payeur (Caisse, une IPM ou une assurance) explique tous les prix, le
 * devis lui est rattache.
 *
 * Sans --appliquer, rien n'est modifie : la commande affiche un resume et
 * ecrit un rapport CSV (devis a deplacer + devis a verifier a la main).
 */
class ReattribuerDevis extends Command
{
    protected $signature = 'devis:reattribuer
        {--appliquer : Enregistre les rattachements sans ambiguite (sinon simple rapport)}
        {--depuis= : Ne traite que les devis a partir de cette date (AAAA-MM-JJ)}
        {--tolerance=1 : Ecart de prix accepte (FCFA) entre une ligne et le tarif}';

    protected $description = "Retrouve l'IPM / assurance / Caisse d'origine des anciens devis a partir des tarifs";

    /** @var array<string, array<string, float>> prix par analyse puis par payeur ("IPM:id", "ASSURANCE:id", "CAISSE") */
    private array $specifiques = [];

    /** @var array<string, array<string, float>> prix generiques par analyse puis par type (IPM / ASSURANCE) */
    private array $generiques = [];

    /** @var array<string, string> cle payeur => nom lisible */
    private array $payeurs = [];

    public function handle(): int
    {
        $this->chargerTarifs();
        $tolerance = (float) $this->option('tolerance');

        $query = Devis::with(['patient:id,nom_complet,matricule', 'lignes:id,devis_id,analyse_id,prix'])
            ->where('is_proforma', false)
            ->orderBy('date_creation');
        if ($depuis = $this->option('depuis')) {
            $query->where('date_creation', '>=', $depuis);
        }

        $compte = ['coherent' => 0, 'a_deplacer' => 0, 'a_verifier' => 0, 'sans_prix' => 0];
        $rapport = [];
        $aDeplacer = [];

        $query->chunk(500, function ($devisList) use (&$compte, &$rapport, &$aDeplacer, $tolerance) {
            foreach ($devisList as $devis) {
                // Seules les lignes comparables comptent : un prix > 0 et au moins un tarif pour l'analyse.
                $lignes = $devis->lignes->filter(fn ($l) => (float) $l->prix > 0
                    && (isset($this->specifiques[$l->analyse_id]) || isset($this->generiques[$l->analyse_id])));
                if ($lignes->isEmpty()) {
                    $compte['sans_prix']++;
                    continue;
                }

                $candidats = array_keys(array_filter($this->payeurs, function ($nom, $cle) use ($lignes, $tolerance) {
                    foreach ($lignes as $ligne) {
                        $attendu = $this->prixAttendu($ligne->analyse_id, $cle);
                        if ($attendu === null || abs($attendu - (float) $ligne->prix) > $tolerance) {
                            return false;
                        }
                    }

                    return true;
                }, ARRAY_FILTER_USE_BOTH));

                $actuel = $this->cleDevis($devis);

                if (in_array($actuel, $candidats, true)) {
                    $compte['coherent']++;
                    continue;
                }

                $statut = count($candidats) === 1 ? 'a_deplacer' : 'a_verifier';
                $compte[$statut]++;
                if ($statut === 'a_deplacer') {
                    $aDeplacer[$devis->id] = $candidats[0];
                }

                $rapport[] = [
                    $statut === 'a_deplacer' ? 'A DEPLACER' : 'A VERIFIER',
                    $devis->numero,
                    $devis->date_creation?->format('Y-m-d'),
                    $devis->patient?->nom_complet,
                    $devis->patient?->matricule,
                    (float) $devis->total,
                    $devis->taux_couverture,
                    $this->payeurs[$actuel] ?? ($actuel ?: 'non renseigne'),
                    $statut === 'a_deplacer' ? $this->payeurs[$candidats[0]] : '',
                    $statut === 'a_verifier'
                        ? (count($candidats) === 0 ? 'aucun tarif ne correspond (prix modifies ?)' : implode(' / ', array_map(fn ($c) => $this->payeurs[$c], $candidats)))
                        : '',
                ];
            }
        });

        $fichier = storage_path('app/reattribution-devis-'.now()->format('Ymd-His').'.csv');
        $this->ecrireCsv($fichier, $rapport);

        $this->info('Analyse des devis (hors proforma) :');
        $this->table(['Resultat', 'Devis'], [
            ['Deja dans la bonne facture', $compte['coherent']],
            ['A deplacer (un seul payeur possible)', $compte['a_deplacer']],
            ['A verifier a la main (aucun ou plusieurs payeurs possibles)', $compte['a_verifier']],
            ['Non verifiables (aucun tarif pour comparer) : laisses tels quels', $compte['sans_prix']],
        ]);
        $this->line("Rapport detaille : {$fichier}");

        if (! $this->option('appliquer')) {
            $this->warn('Aucune modification faite. Relancez avec --appliquer pour deplacer les devis "A DEPLACER".');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($aDeplacer) {
            foreach ($aDeplacer as $devisId => $cle) {
                [$type, $id] = array_pad(explode(':', $cle, 2), 2, null);
                Devis::whereKey($devisId)->update([
                    'type_prise_en_charge' => $type,
                    'ipm_id' => $type === 'IPM' ? $id : null,
                    'assurance_id' => $type === 'ASSURANCE' ? $id : null,
                ]);
            }
        });
        $this->info(count($aDeplacer).' devis rattaches a leur payeur d\'origine. Les devis "A VERIFIER" n\'ont pas ete modifies.');

        return self::SUCCESS;
    }

    private function chargerTarifs(): void
    {
        $this->payeurs['CAISSE'] = 'Caisse';
        foreach (Ipm::orderBy('nom')->get(['id', 'nom']) as $ipm) {
            $this->payeurs["IPM:{$ipm->id}"] = "IPM : {$ipm->nom}";
        }
        foreach (Assurance::orderBy('nom')->get(['id', 'nom']) as $assurance) {
            $this->payeurs["ASSURANCE:{$assurance->id}"] = "Assurance : {$assurance->nom}";
        }

        foreach (Tarif::get(['analyse_id', 'type_prise_en_charge', 'ipm_id', 'assurance_id', 'prix']) as $t) {
            $prix = (float) $t->prix;
            if ($t->type_prise_en_charge === 'CAISSE') {
                $this->specifiques[$t->analyse_id]['CAISSE'] = $prix;
            } elseif ($t->ipm_id) {
                $this->specifiques[$t->analyse_id]["IPM:{$t->ipm_id}"] = $prix;
            } elseif ($t->assurance_id) {
                $this->specifiques[$t->analyse_id]["ASSURANCE:{$t->assurance_id}"] = $prix;
            } elseif (in_array($t->type_prise_en_charge, ['IPM', 'ASSURANCE'], true)) {
                $this->generiques[$t->analyse_id][$t->type_prise_en_charge] = $prix;
            }
        }
    }

    /** Meme logique que le formulaire de devis : tarif specifique, sinon tarif generique du type. */
    private function prixAttendu(string $analyseId, string $cle): ?float
    {
        if (isset($this->specifiques[$analyseId][$cle])) {
            return $this->specifiques[$analyseId][$cle];
        }
        if ($cle === 'CAISSE') {
            return null;
        }
        $type = explode(':', $cle)[0];

        return $this->generiques[$analyseId][$type] ?? null;
    }

    private function cleDevis(Devis $devis): ?string
    {
        return match ($devis->type_prise_en_charge) {
            'CAISSE' => 'CAISSE',
            'IPM' => $devis->ipm_id ? "IPM:{$devis->ipm_id}" : null,
            'ASSURANCE' => $devis->assurance_id ? "ASSURANCE:{$devis->assurance_id}" : null,
            default => null,
        };
    }

    private function ecrireCsv(string $fichier, array $lignes): void
    {
        $f = fopen($fichier, 'w');
        fwrite($f, "\xEF\xBB\xBF"); // BOM : accents corrects a l'ouverture dans Excel
        fputcsv($f, ['Resultat', 'Numero', 'Date', 'Patient', 'Matricule', 'Total', 'Taux patient (%)', 'Prise en charge actuelle du devis', 'Payeur retrouve', 'Payeurs possibles / remarque'], ';');
        foreach ($lignes as $ligne) {
            fputcsv($f, $ligne, ';');
        }
        fclose($f);
    }
}
