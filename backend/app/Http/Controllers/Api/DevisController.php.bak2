<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\DevisResource;
use App\Models\Devis;
use App\Models\DevisLigne;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DevisController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        $query = Devis::with('patient')->where('is_proforma', false);

        if ($request->boolean('with_lignes')) {
            $query->with('lignes.analyse');
        }

        $this->applySearch($query, $request);
        $this->applyPeriodFilter($query, $request);
        $this->applyEntiteFilter($query, $request);
        $this->applyOrdering($query, $request);

        return $this->paginatedResponse($query, $request, DevisResource::class);
    }

    public function proforma(Request $request)
    {
        $query = Devis::with('patient')->where('is_proforma', true);

        $this->applySearch($query, $request);
        $this->applyOrdering($query, $request);

        return $this->paginatedResponse($query, $request, DevisResource::class);
    }

    protected function applySearch($query, Request $request): void
    {
        $search = trim((string) $request->query('search', ''));

        if ($search === '') {
            return;
        }

        $query->where(function ($builder) use ($search) {
            $builder->where('numero', 'like', "%{$search}%")
                ->orWhereHas('patient', function ($p) use ($search) {
                    $p->where('nom_complet', 'like', "%{$search}%")
                        ->orWhere('matricule', 'like', "%{$search}%");
                });
        });
    }

    /**
     * Filtre par mois (format YYYY-MM), utilise par les Factures Mensuelles.
     * Evite de devoir charger tous les devis cote client pour les filtrer.
     */
    protected function applyPeriodFilter($query, Request $request): void
    {
        $mois = $request->query('mois');

        if ($mois && preg_match('/^\d{4}-\d{2}$/', $mois)) {
            [$annee, $moisNum] = explode('-', $mois);
            $debut = Carbon::create((int) $annee, (int) $moisNum, 1)->startOfDay();
            $fin = $debut->copy()->endOfMonth()->endOfDay();

            $query->whereBetween('date_creation', [$debut, $fin]);

            return;
        }

        $dateDebut = $request->query('date_debut');
        $dateFin = $request->query('date_fin');

        if ($dateDebut) {
            $query->where('date_creation', '>=', Carbon::parse($dateDebut)->startOfDay());
        }

        if ($dateFin) {
            $query->where('date_creation', '<=', Carbon::parse($dateFin)->endOfDay());
        }
    }

    protected function applyEntiteFilter($query, Request $request): void
    {
        $type = $request->query('type_prise_en_charge');

        if (! in_array($type, ['IPM', 'ASSURANCE'], true)) {
            return;
        }

        $entiteId = $request->query('entite_id');
        $column = $type === 'IPM' ? 'ipm_id' : 'assurance_id';

        $query->whereHas('patient', function ($p) use ($type, $column, $entiteId) {
            $p->where('type_prise_en_charge', $type);
            if ($entiteId) {
                $p->where($column, $entiteId);
            }
        });
    }

    protected function applyOrdering($query, Request $request): void
    {
        $ordering = (string) $request->query('ordering', '-date_creation');
        $direction = 'asc';

        if (str_starts_with($ordering, '-')) {
            $direction = 'desc';
            $ordering = substr($ordering, 1);
        }

        $allowed = ['date_creation', 'numero', 'total'];

        if (! in_array($ordering, $allowed, true)) {
            $ordering = 'date_creation';
            $direction = 'desc';
        }

        $query->orderBy($ordering, $direction);
    }

    public function store(Request $request)
    {
        $data = $this->validateDevisPayload($request);

        $devis = DB::transaction(function () use ($data) {
            $numero = $this->genererNumero();

            $devis = Devis::create([
                'id' => (string) Str::uuid(),
                'numero' => $numero,
                'patient_id' => $data['patient'],
                'souscripteur' => $data['souscripteur'],
                'taux_couverture' => $data['taux_couverture'],
                'is_proforma' => $data['is_proforma'],
                'total' => 0,
            ]);

            $total = $this->creerLignes($devis, $data['lignes']);

            $devis->total = $total;
            $devis->save();

            return $devis;
        });

        $devis->load(['patient', 'lignes.analyse']);

        return DevisResource::make($devis)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        $devis = Devis::with(['patient', 'lignes.analyse'])->findOrFail($id);

        return DevisResource::make($devis);
    }

    public function update(Request $request, string $id)
    {
        $devis = Devis::findOrFail($id);
        $data = $this->validateDevisPayload($request, partial: true);

        DB::transaction(function () use ($devis, $data) {
            if (array_key_exists('patient', $data)) {
                $devis->patient_id = $data['patient'];
            }
            if (array_key_exists('souscripteur', $data)) {
                $devis->souscripteur = $data['souscripteur'];
            }
            if (array_key_exists('taux_couverture', $data)) {
                $devis->taux_couverture = $data['taux_couverture'];
            }
            if (array_key_exists('is_proforma', $data)) {
                $devis->is_proforma = $data['is_proforma'];
            }

            if (array_key_exists('lignes', $data)) {
                DevisLigne::where('devis_id', $devis->id)->delete();
                $total = $this->creerLignes($devis, $data['lignes']);
                $devis->total = $total;
            }

            $devis->save();
        });

        $devis->load(['patient', 'lignes.analyse']);

        return DevisResource::make($devis);
    }

    public function destroy(string $id)
    {
        Devis::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function updatePaiement(Request $request, string $id)
    {
        $devis = Devis::findOrFail($id);

        $statut = $request->input('statutPaiement');
        if ($statut !== null) {
            if (! in_array($statut, ['NON_REGLE', 'PARTIELLEMENT_REGLE', 'REGLE'], true)) {
                return response()->json(['detail' => 'statutPaiement invalide.'], 400);
            }
            $devis->statut_paiement = $statut;
        }

        if ($request->has('datePaiement')) {
            $devis->date_paiement = $request->input('datePaiement') ?: null;
        }

        if ($request->has('commentairePaiement')) {
            $devis->commentaire_paiement = $request->input('commentairePaiement');
        }

        $devis->save();
        $devis->load(['patient', 'lignes.analyse']);

        return DevisResource::make($devis);
    }

    protected function validateDevisPayload(Request $request, bool $partial = false): array
    {
        $rules = [
            'patient' => ($partial ? 'sometimes' : 'required').'|string|exists:patients,id',
            'souscripteur' => 'nullable|string|max:255',
            'taux_couverture' => 'nullable|string|max:10',
            'is_proforma' => 'sometimes|boolean',
            'lignes' => ($partial ? 'sometimes' : 'required').'|array',
            'lignes.*.analyseId' => 'required_with:lignes|string|exists:analyses,id',
            'lignes.*.prix' => 'required_with:lignes|numeric|min:0',
            'lignes.*.quantite' => 'nullable|integer|min:1',
        ];

        return $request->validate($rules);
    }

    protected function creerLignes(Devis $devis, array $lignes): float
    {
        $total = 0;

        foreach ($lignes as $ligne) {
            $prix = (float) $ligne['prix'];
            $quantite = (int) ($ligne['quantite'] ?? 1);

            DevisLigne::create([
                'id' => (string) Str::uuid(),
                'devis_id' => $devis->id,
                'analyse_id' => $ligne['analyseId'],
                'prix' => $prix,
                'quantite' => $quantite,
            ]);

            $total += $prix * $quantite;
        }

        return $total;
    }

    protected function genererNumero(): string
    {
        $annee = now()->year;

        $dernier = Devis::where('numero', 'like', "{$annee}-%")
            ->lockForUpdate()
            ->orderByDesc('numero')
            ->first();

        $sequence = 1;

        if ($dernier) {
            $parts = explode('-', $dernier->numero);
            $sequence = ((int) end($parts)) + 1;
        }

        return sprintf('%d-%05d', $annee, $sequence);
    }
}
