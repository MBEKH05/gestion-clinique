<?php

namespace App\Http\Controllers\Api\Lab;

use App\Http\Controllers\Controller;
use App\Models\LabDocumentAnnexe;
use App\Models\LabDossier;
use App\Models\LabUser;
use Carbon\Carbon;

class LabStatsController extends Controller
{
    public function stats()
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        $counts = LabDossier::selectRaw(
            "COUNT(*) as total,
             SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) as en_attente,
             SUM(CASE WHEN statut = 'VALIDE_MEDECIN' THEN 1 ELSE 0 END) as valide_medecin,
             SUM(CASE WHEN statut = 'REFUSE' THEN 1 ELSE 0 END) as refuse,
             SUM(CASE WHEN statut = 'VALIDE_FINAL' THEN 1 ELSE 0 END) as valide_final,
             SUM(CASE WHEN statut = 'ARCHIVE' THEN 1 ELSE 0 END) as archive,
             SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as dossiers_mois",
            [$startOfMonth]
        )->first();

        return response()->json([
            'total' => (int) $counts->total,
            'enAttente' => (int) $counts->en_attente,
            'valideMedecin' => (int) $counts->valide_medecin,
            'refuse' => (int) $counts->refuse,
            'valideFinal' => (int) $counts->valide_final,
            'archive' => (int) $counts->archive,
            'dossiersMois' => (int) $counts->dossiers_mois,
            'usersActifs' => LabUser::where('is_active', true)->count(),
            'usersTotal' => LabUser::count(),
            'hospitalisations' => LabDocumentAnnexe::count(),
        ]);
    }
}
