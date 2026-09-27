<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assurance;
use App\Models\Devis;
use App\Models\Ipm;
use App\Support\FactureNumero;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StatistiqueController extends Controller
{
    public function paiement(Request $request)
    {
        $now = Carbon::now();
        $annee = (int) $request->query('annee', $now->year);
        $periode = $request->query('periode', 'mois');

        if ($periode === 'annee') {
            $mois = null;
            $debut = Carbon::create($annee, 1, 1)->startOfDay();
            $fin = Carbon::create($annee, 12, 31)->endOfDay();
        } else {
            $mois = (int) $request->query('mois', $now->month);
            $debut = Carbon::create($annee, $mois, 1)->startOfDay();
            $fin = $debut->copy()->endOfMonth()->endOfDay();
        }

        $devisList = Devis::query()
            ->select(['id', 'numero', 'patient_id', 'total', 'taux_couverture', 'date_creation', 'statut_paiement', 'date_paiement', 'commentaire_paiement'])
            ->with(['patient:id,nom_complet,matricule,type_prise_en_charge,ipm_id,assurance_id'])
            ->orderBy('date_creation')
            ->where('is_proforma', false)
            ->whereBetween('date_creation', [$debut, $fin])
            ->get();

        $groupes = [];

        foreach ($devisList as $devis) {
            $patient = $devis->patient;

            if (! $patient) {
                continue;
            }

            $entiteId = $patient->type_prise_en_charge === 'IPM' ? $patient->ipm_id : $patient->assurance_id;

            if (! $entiteId) {
                continue;
            }

            $taux = is_numeric($devis->taux_couverture) ? (float) $devis->taux_couverture : 0.0;
            $montantCouvert = (float) $devis->total * (1 - ($taux / 100));

            $key = $patient->type_prise_en_charge.':'.$entiteId;

            if (! isset($groupes[$key])) {
                $groupes[$key] = [
                    'type' => $patient->type_prise_en_charge,
                    'entiteId' => $entiteId,
                    'montantCouvert' => 0.0,
                    'statuts' => [],
                    'datePaiement' => null,
                    'commentaires' => [],
                    'devisIds' => [],
                    'devis' => [],
                ];
            }

            $groupes[$key]['montantCouvert'] += $montantCouvert;
            $statutDevis = $this->normaliserStatut($devis->statut_paiement);
            $groupes[$key]['statuts'][] = $statutDevis;
            $groupes[$key]['devisIds'][] = $devis->id;
            $groupes[$key]['devis'][] = [
                'id' => $devis->id,
                'numero' => $devis->numero,
                'dateCreation' => optional($devis->date_creation)->toDateString(),
                'patientNom' => $patient->nom_complet,
                'matricule' => $patient->matricule,
                'total' => round((float) $devis->total, 2),
                'tauxCouverture' => $taux,
                'montantCouvert' => round($montantCouvert, 2),
                'statutPaiement' => $statutDevis,
                'datePaiement' => optional($devis->date_paiement)->toDateString(),
            ];

            if ($devis->date_paiement && (! $groupes[$key]['datePaiement'] || $devis->date_paiement->gt($groupes[$key]['datePaiement']))) {
                $groupes[$key]['datePaiement'] = $devis->date_paiement;
            }

            if ($devis->commentaire_paiement) {
                $groupes[$key]['commentaires'][] = $devis->commentaire_paiement;
            }
        }

        $ipmNoms = Ipm::pluck('nom', 'id');
        $assuranceNoms = Assurance::pluck('nom', 'id');

        $factures = [];

        foreach ($groupes as $groupe) {
            $entiteNom = $groupe['type'] === 'IPM'
                ? ($ipmNoms[$groupe['entiteId']] ?? 'IPM inconnue')
                : ($assuranceNoms[$groupe['entiteId']] ?? 'Assurance inconnue');

            $statutsUniques = array_unique($groupe['statuts']);
            $statutFacture = count($statutsUniques) === 1 ? $statutsUniques[array_key_first($statutsUniques)] : 'PARTIELLEMENT_REGLE';

            $factures[] = [
                'id' => $groupe['type'].':'.$groupe['entiteId'],
                'numeroFacture' => FactureNumero::generate($mois ?? 0, $annee, $groupe['entiteId']),
                'entiteId' => $groupe['entiteId'],
                'entiteNom' => $entiteNom,
                'typePriseEnCharge' => $groupe['type'],
                'montantCouvert' => round($groupe['montantCouvert'], 2),
                'statutPaiement' => $statutFacture,
                'datePaiement' => optional($groupe['datePaiement'])->toDateString(),
                'commentairePaiement' => implode(' | ', $groupe['commentaires']),
                'devis_ids' => $groupe['devisIds'],
                'devis' => $groupe['devis'],
                // Nombre de devis par statut : une facture peut contenir des devis regles et non regles.
                'repartition' => [
                    'NON_REGLE' => count(array_keys($groupe['statuts'], 'NON_REGLE', true)),
                    'PARTIELLEMENT_REGLE' => count(array_keys($groupe['statuts'], 'PARTIELLEMENT_REGLE', true)),
                    'REGLE' => count(array_keys($groupe['statuts'], 'REGLE', true)),
                ],
            ];
        }

        usort($factures, fn ($a, $b) => strcmp($a['entiteNom'], $b['entiteNom']));

        // Une facture compte dans un statut des qu'elle contient au moins un devis dans ce statut (comme le filtre).
        $statistiques = fn (array $liste) => [
            'nonRegles' => count(array_filter($liste, fn ($f) => $f['repartition']['NON_REGLE'] > 0)),
            'partiellementRegles' => count(array_filter($liste, fn ($f) => $f['repartition']['PARTIELLEMENT_REGLE'] > 0)),
            'regles' => count(array_filter($liste, fn ($f) => $f['repartition']['REGLE'] > 0)),
            'montantTotal' => round(array_sum(array_column($liste, 'montantCouvert')), 2),
        ];

        return response()->json([
            'statistiques' => $statistiques($factures),
            'statistiquesIPM' => $statistiques(array_values(array_filter($factures, fn ($f) => $f['typePriseEnCharge'] === 'IPM'))),
            'statistiquesAssurance' => $statistiques(array_values(array_filter($factures, fn ($f) => $f['typePriseEnCharge'] !== 'IPM'))),
            'factures' => $factures,
        ]);
    }

    /**
     * Ramene un statut de paiement (vide, minuscules, accents, espaces...) a l'une des valeurs
     * NON_REGLE / PARTIELLEMENT_REGLE / REGLE. Un devis sans statut est considere non regle.
     */
    private function normaliserStatut(?string $statut): string
    {
        $valeur = strtoupper(trim((string) $statut));
        $valeur = str_replace(['É', 'é', 'È', 'è', ' ', '-'], ['E', 'E', 'E', 'E', '_', '_'], $valeur);

        return match (true) {
            str_contains($valeur, 'PARTIEL') => 'PARTIELLEMENT_REGLE',
            str_starts_with($valeur, 'NON') || $valeur === '' => 'NON_REGLE',
            $valeur === 'REGLE' || $valeur === 'PAYE' => 'REGLE',
            default => 'NON_REGLE',
        };
    }
}
