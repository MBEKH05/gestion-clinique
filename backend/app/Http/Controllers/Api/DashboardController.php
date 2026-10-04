<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Analyse;
use App\Models\Assurance;
use App\Models\Devis;
use App\Models\Ipm;
use App\Models\Patient;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth()->toDateTimeString();
        $startOfDay = $now->copy()->startOfDay()->toDateTimeString();

        // Une seule requete d'agregation conditionnelle plutot que 5 requetes
        // separees : reste rapide meme avec des centaines de milliers de devis.
        $devisStats = Devis::where('is_proforma', false)
            ->selectRaw(
                'COUNT(*) as total_devis,
                 SUM(CASE WHEN date_creation >= ? THEN 1 ELSE 0 END) as devis_mois,
                 SUM(CASE WHEN date_creation >= ? THEN total ELSE 0 END) as montant_mois,
                 SUM(CASE WHEN date_creation >= ? THEN 1 ELSE 0 END) as devis_jour,
                 SUM(CASE WHEN date_creation >= ? THEN total ELSE 0 END) as montant_jour',
                [$startOfMonth, $startOfMonth, $startOfDay, $startOfDay]
            )
            ->first();

        return response()->json([
            'totalAnalyses' => Analyse::count(),
            'totalIPM' => Ipm::count(),
            'totalAssurances' => Assurance::count(),
            'totalPatients' => Patient::count(),
            'totalDevis' => (int) $devisStats->total_devis,
            'devisMois' => (int) $devisStats->devis_mois,
            'totalMontantMois' => (float) $devisStats->montant_mois,
            'devisAujourdhui' => (int) $devisStats->devis_jour,
            'montantAujourdhui' => (float) $devisStats->montant_jour,
        ]);
    }
}
