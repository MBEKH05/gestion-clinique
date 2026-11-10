<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Devis;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Rapport d'activite par compte (secretaire / Manager) :
 * patients enregistres, devis etablis et leur prise en charge.
 *
 * - Un Manager ne voit que son propre rapport.
 * - Le Super Admin peut consulter le rapport de n'importe quel compte
 *   et dispose d'un resume de tous les comptes.
 *
 * Les patients / devis enregistres avant la mise en place du suivi
 * (created_by NULL) sont comptes comme "non attribues".
 */
class RapportSecretaireController extends Controller
{
    public function show(Request $request)
    {
        [$debut, $fin] = $this->periode($request);
        $user = $request->user();

        $cible = $user;
        if ($user->is_superuser && $request->filled('user_id')) {
            $cible = User::findOrFail($request->integer('user_id'));
        }

        $patients = Patient::with(['ipm:id,nom', 'assurance:id,nom'])
            ->where('created_by', $cible->id)
            ->whereBetween('created_at', [$debut, $fin])
            ->orderBy('created_at', 'desc')
            ->get();

        $devis = Devis::with(['patient.ipm:id,nom', 'patient.assurance:id,nom'])
            ->where('created_by', $cible->id)
            ->where('is_proforma', false)
            ->whereBetween('date_creation', [$debut, $fin])
            ->orderBy('date_creation', 'desc')
            ->get();

        $devisRows = $devis->map(fn (Devis $d) => $this->devisRow($d));

        $parType = ['IPM' => 0, 'ASSURANCE' => 0, 'CAISSE' => 0];
        foreach ($patients as $p) {
            $parType[$p->type_prise_en_charge] = ($parType[$p->type_prise_en_charge] ?? 0) + 1;
        }

        $parJour = [];
        foreach ($patients as $p) {
            $jour = $p->created_at->toDateString();
            $parJour[$jour] ??= ['date' => $jour, 'patients' => 0, 'devis' => 0, 'montant' => 0.0];
            $parJour[$jour]['patients']++;
        }
        foreach ($devisRows as $row) {
            $jour = substr($row['date'], 0, 10);
            $parJour[$jour] ??= ['date' => $jour, 'patients' => 0, 'devis' => 0, 'montant' => 0.0];
            $parJour[$jour]['devis']++;
            $parJour[$jour]['montant'] += $row['total'];
        }
        krsort($parJour);

        return response()->json([
            'compte' => $this->compte($cible),
            'periode' => ['debut' => $debut->toDateString(), 'fin' => $fin->toDateString()],
            'totaux' => [
                'patients' => $patients->count(),
                'patientsParType' => $parType,
                'devis' => $devisRows->count(),
                'montantTotal' => round($devisRows->sum('total'), 2),
                'partCouverte' => round($devisRows->sum('partCouverte'), 2),
                'partPatient' => round($devisRows->sum('partPatient'), 2),
            ],
            'parJour' => array_values($parJour),
            'patients' => $patients->map(fn (Patient $p) => [
                'id' => $p->id,
                'nomComplet' => $p->nom_complet,
                'matricule' => $p->matricule,
                'typePriseEnCharge' => $p->type_prise_en_charge,
                'entiteNom' => $this->entiteNom($p),
                'date' => $p->created_at->toIso8601String(),
            ])->values(),
            'devis' => $devisRows->values(),
        ]);
    }

    /** Resume de tous les comptes (Super Admin uniquement). */
    public function resume(Request $request)
    {
        [$debut, $fin] = $this->periode($request);

        $patients = Patient::whereBetween('created_at', [$debut, $fin])
            ->select('created_by', DB::raw('COUNT(*) as nb'))
            ->groupBy('created_by')
            ->pluck('nb', 'created_by');

        $devis = Devis::where('is_proforma', false)
            ->whereBetween('date_creation', [$debut, $fin])
            ->select('created_by', DB::raw('COUNT(*) as nb'), DB::raw('COALESCE(SUM(total), 0) as montant'))
            ->groupBy('created_by')
            ->get()
            ->keyBy(fn ($row) => (string) $row->created_by);

        $comptes = User::orderBy('username')->get()->map(fn (User $u) => [
            ...$this->compte($u),
            'patients' => (int) ($patients[$u->id] ?? 0),
            'devis' => (int) ($devis[(string) $u->id]->nb ?? 0),
            'montant' => (float) ($devis[(string) $u->id]->montant ?? 0),
        ]);

        return response()->json([
            'periode' => ['debut' => $debut->toDateString(), 'fin' => $fin->toDateString()],
            'comptes' => $comptes->values(),
            'nonAttribues' => [
                'patients' => (int) ($patients[''] ?? 0),
                'devis' => (int) ($devis['']->nb ?? 0),
                'montant' => (float) ($devis['']->montant ?? 0),
            ],
        ]);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function periode(Request $request): array
    {
        $request->validate([
            'debut' => ['nullable', 'date_format:Y-m-d'],
            'fin' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $debut = $request->filled('debut')
            ? Carbon::parse($request->input('debut'))->startOfDay()
            : Carbon::now()->startOfMonth();
        $fin = $request->filled('fin')
            ? Carbon::parse($request->input('fin'))->endOfDay()
            : Carbon::now()->endOfDay();

        if ($fin->lt($debut)) {
            [$debut, $fin] = [$fin->copy()->startOfDay(), $debut->copy()->endOfDay()];
        }

        return [$debut, $fin];
    }

    private function compte(User $u): array
    {
        return [
            'id' => $u->id,
            'username' => $u->username,
            'name' => $u->name,
            'role' => $u->is_superuser ? 'Super Admin' : 'Manager',
            'actif' => (bool) $u->is_active,
        ];
    }

    private function entiteNom(?Patient $p): ?string
    {
        if (! $p) {
            return null;
        }

        return match ($p->type_prise_en_charge) {
            'IPM' => $p->ipm?->nom,
            'ASSURANCE' => $p->assurance?->nom,
            default => 'Caisse',
        };
    }

    private function devisRow(Devis $d): array
    {
        // taux_couverture = part (%) payee par le patient, comme dans DevisDetail / Statistiques.
        $total = (float) $d->total;
        $taux = is_numeric($d->taux_couverture) ? (float) $d->taux_couverture : 0.0;
        $partPatient = $total * ($taux / 100);

        return [
            'id' => $d->id,
            'numero' => $d->numero,
            'date' => $d->date_creation->toIso8601String(),
            'patientNom' => $d->patient?->nom_complet,
            'patientMatricule' => $d->patient?->matricule,
            'typePriseEnCharge' => $d->patient?->type_prise_en_charge,
            'entiteNom' => $this->entiteNom($d->patient),
            'tauxCouverture' => $d->taux_couverture,
            'total' => round($total, 2),
            'partCouverte' => round($total - $partPatient, 2),
            'partPatient' => round($partPatient, 2),
            'statutPaiement' => $d->statut_paiement,
        ];
    }
}
