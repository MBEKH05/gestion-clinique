<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Devis;
use App\Models\LabDossier;
use App\Models\LabUser;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Carbon;

class PlatformDashboardController extends Controller
{
    public function stats()
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        $devisStats = Devis::where('is_proforma', false)
            ->selectRaw(
                'COUNT(*) as total_devis,
                 SUM(CASE WHEN date_creation >= ? THEN 1 ELSE 0 END) as devis_mois,
                 SUM(CASE WHEN date_creation >= ? THEN total ELSE 0 END) as montant_mois',
                [$startOfMonth, $startOfMonth]
            )
            ->first();

        $labStats = LabDossier::selectRaw(
            "COUNT(*) as total,
             SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) as en_attente,
             SUM(CASE WHEN statut = 'VALIDE_FINAL' THEN 1 ELSE 0 END) as valide_final,
             SUM(CASE WHEN statut = 'ARCHIVE' THEN 1 ELSE 0 END) as archive,
             SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as dossiers_mois",
            [$startOfMonth]
        )->first();

        return response()->json([
            'facturation' => [
                'totalPatients' => Patient::count(),
                'totalUtilisateurs' => User::count(),
                'totalDevis' => (int) $devisStats->total_devis,
                'devisMois' => (int) $devisStats->devis_mois,
                'montantMois' => (float) $devisStats->montant_mois,
            ],
            'laboratoire' => [
                'totalUtilisateurs' => LabUser::count(),
                'totalDossiers' => (int) $labStats->total,
                'enAttente' => (int) $labStats->en_attente,
                'valideFinal' => (int) $labStats->valide_final,
                'archive' => (int) $labStats->archive,
                'dossiersMois' => (int) $labStats->dossiers_mois,
            ],
        ]);
    }
}
