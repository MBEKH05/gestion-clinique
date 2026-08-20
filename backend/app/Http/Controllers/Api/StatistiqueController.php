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

        $nonRegles = 0;
        $partiellementRegles = 0;
        $regles = 0;
        $montantTotal = 0.0;

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

            $montantTotal += $montantCouvert;

            match ($devis->statut_paiement) {
                'NON_REGLE' => $nonRegles++,
                'PARTIELLEMENT_REGLE' => $partiellementRegles++,
                'REGLE' => $regles++,
                default => null,
            };

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

        return response()->json([
            'statistiques' => [
                'nonRegles' => $nonRegles,
                'partiellementRegles' => $partiellementRegles,
                'regles' => $regles,
                'montantTotal' => round($montantTotal, 2),
            ],
            'factures' => $factures,
        ]);
    }
}
