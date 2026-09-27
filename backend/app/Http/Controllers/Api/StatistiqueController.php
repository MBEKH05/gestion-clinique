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
            ->select(['id', 'patient_id', 'total', 'taux_couverture', 'statut_paiement', 'date_paiement', 'commentaire_paiement'])
            ->with(['patient:id,type_prise_en_charge,ipm_id,assurance_id'])
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
                ];
            }

            $groupes[$key]['montantCouvert'] += $montantCouvert;
            $groupes[$key]['statuts'][] = $devis->statut_paiement;
            $groupes[$key]['devisIds'][] = $devis->id;

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
            ];
        }

        usort($factures, fn ($a, $b) => strcmp($a['entiteNom'], $b['entiteNom']));

        // Les compteurs portent sur les factures (une par IPM/assurance), comme le tableau affiché.
        $statistiques = fn (array $liste) => [
            'nonRegles' => count(array_filter($liste, fn ($f) => $f['statutPaiement'] === 'NON_REGLE')),
            'partiellementRegles' => count(array_filter($liste, fn ($f) => $f['statutPaiement'] === 'PARTIELLEMENT_REGLE')),
            'regles' => count(array_filter($liste, fn ($f) => $f['statutPaiement'] === 'REGLE')),
            'montantTotal' => round(array_sum(array_column($liste, 'montantCouvert')), 2),
        ];

        return response()->json([
            'statistiques' => $statistiques($factures),
            'statistiquesIPM' => $statistiques(array_values(array_filter($factures, fn ($f) => $f['typePriseEnCharge'] === 'IPM'))),
            'statistiquesAssurance' => $statistiques(array_values(array_filter($factures, fn ($f) => $f['typePriseEnCharge'] !== 'IPM'))),
            'factures' => $factures,
        ]);
    }
}
