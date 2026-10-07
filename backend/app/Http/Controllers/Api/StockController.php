<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Analyse;
use App\Models\StockMouvement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Gestion de stock des medicaments.
 *
 * Stock = somme des mouvements manuels (entrees +, sorties -, ecarts d'inventaire +/-)
 *       - quantites vendues dans les devis (hors proformas).
 * Les ventes ne comptent qu'a partir du premier mouvement de stock du medicament
 * (le stock initial), pour que l'historique des ventes anterieures ne rende pas le stock negatif.
 */
class StockController extends Controller
{
    private const CATEGORIE = 'medicament';

    private const JOURS_ALERTE_PEREMPTION = 90;

    /** Etat du stock de tous les medicaments. */
    public function index()
    {
        $medicaments = Analyse::where('categorie', self::CATEGORIE)->orderBy('nom')->get(['id', 'nom', 'seuil_alerte']);

        $mouvements = DB::table('stock_mouvements')
            ->groupBy('analyse_id')
            ->select([
                'analyse_id',
                DB::raw("SUM(CASE WHEN type = 'ENTREE' THEN quantite ELSE 0 END) as entrees"),
                DB::raw("SUM(CASE WHEN type = 'SORTIE' THEN -quantite ELSE 0 END) as sorties"),
                DB::raw("SUM(CASE WHEN type = 'INVENTAIRE' THEN quantite ELSE 0 END) as ajustements"),
                DB::raw('MIN(date_mouvement) as debut_suivi'),
                DB::raw('MAX(date_mouvement) as dernier_mouvement'),
            ])
            ->get()
            ->keyBy('analyse_id');

        $ventes = $this->ventesQuery()
            ->groupBy('l.analyse_id')
            ->select(['l.analyse_id', DB::raw('SUM(l.quantite) as quantite'), DB::raw('MAX(d.date_creation) as derniere_vente')])
            ->get()
            ->keyBy('analyse_id');

        // Consommation des 30 derniers jours (toutes ventes) pour estimer l'autonomie.
        $depuis = Carbon::now()->subDays(30)->startOfDay();
        $ventes30j = DB::table('devis_lignes as l')
            ->join('devis as d', 'd.id', '=', 'l.devis_id')
            ->join('analyses as a', 'a.id', '=', 'l.analyse_id')
            ->where('a.categorie', self::CATEGORIE)
            ->where('d.is_proforma', false)
            ->where('d.date_creation', '>=', $depuis)
            ->groupBy('l.analyse_id')
            ->select(['l.analyse_id', DB::raw('SUM(l.quantite) as quantite')])
            ->pluck('quantite', 'analyse_id');

        $aujourdhui = Carbon::today();
        $peremptions = DB::table('stock_mouvements')
            ->where('type', 'ENTREE')
            ->whereNotNull('date_peremption')
            ->groupBy('analyse_id')
            ->select([
                'analyse_id',
                DB::raw('MIN(CASE WHEN date_peremption >= ? THEN date_peremption END) as prochaine'),
                DB::raw('SUM(CASE WHEN date_peremption < ? THEN 1 ELSE 0 END) as lots_perimes'),
            ])
            ->addBinding([$aujourdhui->toDateString(), $aujourdhui->toDateString()], 'select')
            ->get()
            ->keyBy('analyse_id');

        $lignes = $medicaments->map(function ($m) use ($mouvements, $ventes, $ventes30j, $peremptions, $aujourdhui) {
            $mv = $mouvements->get($m->id);
            $vente = $ventes->get($m->id);
            $per = $peremptions->get($m->id);

            $entrees = (int) ($mv->entrees ?? 0);
            $sorties = (int) ($mv->sorties ?? 0);
            $ajustements = (int) ($mv->ajustements ?? 0);
            $vendus = (int) ($vente->quantite ?? 0);
            $stock = $entrees - $sorties + $ajustements - $vendus;
            $seuil = $m->seuil_alerte;
            $consoJour = round(((int) ($ventes30j[$m->id] ?? 0)) / 30, 2);

            $statut = match (true) {
                ! $mv => 'NON_SUIVI',
                $stock <= 0 => 'RUPTURE',
                $seuil !== null && $stock <= $seuil => 'ALERTE',
                default => 'OK',
            };

            return [
                'analyseId' => $m->id,
                'nom' => $m->nom,
                'entrees' => $entrees,
                'sorties' => $sorties,
                'ajustements' => $ajustements,
                'vendus' => $vendus,
                'stock' => $stock,
                'seuilAlerte' => $seuil,
                'statut' => $statut,
                'consommationJour' => $consoJour,
                'autonomieJours' => $consoJour > 0 && $stock > 0 ? (int) floor($stock / $consoJour) : null,
                'debutSuivi' => $this->iso($mv->debut_suivi ?? null),
                'dernierMouvement' => $this->iso($mv->dernier_mouvement ?? null),
                'derniereVente' => $this->iso($vente->derniere_vente ?? null),
                'prochainePeremption' => $per->prochaine ?? null,
                'peremptionProche' => isset($per->prochaine)
                    && Carbon::parse($per->prochaine)->lte($aujourdhui->copy()->addDays(self::JOURS_ALERTE_PEREMPTION)),
                'lotsPerimes' => (int) ($per->lots_perimes ?? 0),
            ];
        });

        return response()->json([
            'resume' => [
                'nbMedicaments' => $lignes->count(),
                'nbSuivis' => $lignes->where('statut', '!=', 'NON_SUIVI')->count(),
                'nbRupture' => $lignes->where('statut', 'RUPTURE')->count(),
                'nbAlerte' => $lignes->where('statut', 'ALERTE')->count(),
                'nbPeremptionProche' => $lignes->where('peremptionProche', true)->count(),
                'nbLotsPerimes' => $lignes->sum('lotsPerimes'),
                'quantiteEnStock' => $lignes->where('stock', '>', 0)->sum('stock'),
            ],
            'joursAlertePeremption' => self::JOURS_ALERTE_PEREMPTION,
            'medicaments' => $lignes->values(),
        ]);
    }

    /**
     * Journal de tracabilite : mouvements manuels + ventes (devis).
     * Avec un medicament precise, chaque ligne porte le stock apres le mouvement.
     */
    public function mouvements(Request $request)
    {
        $data = $request->validate([
            'analyse_id' => 'nullable|string',
            'type' => 'nullable|in:ENTREE,SORTIE,INVENTAIRE,VENTE',
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date',
        ]);

        $analyseId = $data['analyse_id'] ?? null;
        $debut = isset($data['date_debut']) ? Carbon::parse($data['date_debut'])->startOfDay() : null;
        $fin = isset($data['date_fin']) ? Carbon::parse($data['date_fin'])->endOfDay() : null;

        // Pour calculer le solde, on part de tout l'historique du medicament, puis on filtre.
        $evenements = $this->evenements($analyseId, $analyseId ? null : $debut, $fin);

        if ($analyseId) {
            $solde = 0;
            $evenements = $evenements->map(function ($e) use (&$solde) {
                $solde += $e['quantite'];
                $e['stockApres'] = $solde;

                return $e;
            });
        }

        $evenements = $evenements
            ->filter(fn ($e) => ! $debut || Carbon::parse($e['date'])->gte($debut))
            ->filter(fn ($e) => empty($data['type']) || $e['type'] === $data['type'])
            ->reverse()
            ->values();

        return response()->json([
            'mouvements' => $evenements,
            'totaux' => [
                'entrees' => $evenements->where('type', 'ENTREE')->sum('quantite'),
                'sorties' => -$evenements->where('type', 'SORTIE')->sum('quantite'),
                'ventes' => -$evenements->where('type', 'VENTE')->sum('quantite'),
                'ajustements' => $evenements->where('type', 'INVENTAIRE')->sum('quantite'),
            ],
        ]);
    }

    /** Enregistre une entree, une sortie ou un inventaire. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'analyse_id' => 'required|string|exists:analyses,id',
            'type' => 'required|in:ENTREE,SORTIE,INVENTAIRE',
            'quantite' => 'required_unless:type,INVENTAIRE|nullable|integer|min:1|max:1000000',
            'stock_compte' => 'required_if:type,INVENTAIRE|nullable|integer|min:0|max:1000000',
            'numero_lot' => 'nullable|string|max:100',
            'date_peremption' => 'nullable|date',
            'fournisseur' => 'nullable|string|max:255',
            'prix_achat' => 'nullable|numeric|min:0|max:100000000',
            'motif' => 'required_if:type,SORTIE|nullable|string|max:255',
            'date_mouvement' => 'nullable|date|before_or_equal:now',
        ], [
            'motif.required_if' => 'Le motif est obligatoire pour une sortie (perime, casse, perte, retour fournisseur...).',
            'quantite.required_unless' => 'La quantite est obligatoire.',
            'stock_compte.required_if' => 'La quantite comptee est obligatoire pour un inventaire.',
        ]);

        $analyse = Analyse::findOrFail($data['analyse_id']);
        if ($analyse->categorie !== self::CATEGORIE) {
            return response()->json(['detail' => "Cet article n'est pas un medicament."], 422);
        }

        $date = isset($data['date_mouvement']) ? Carbon::parse($data['date_mouvement']) : Carbon::now();
        $stockAvant = $this->stockA($analyse->id, $date);

        $quantite = match ($data['type']) {
            'ENTREE' => (int) $data['quantite'],
            'SORTIE' => -(int) $data['quantite'],
            'INVENTAIRE' => (int) $data['stock_compte'] - $stockAvant,
        };

        if ($data['type'] === 'SORTIE' && $stockAvant + $quantite < 0) {
            return response()->json(['detail' => "Stock insuffisant : {$stockAvant} unite(s) disponible(s)."], 422);
        }

        $mouvement = StockMouvement::create([
            'analyse_id' => $analyse->id,
            'type' => $data['type'],
            'quantite' => $quantite,
            'stock_compte' => $data['type'] === 'INVENTAIRE' ? (int) $data['stock_compte'] : null,
            'numero_lot' => $data['type'] === 'ENTREE' ? ($data['numero_lot'] ?? null) : null,
            'date_peremption' => $data['type'] === 'ENTREE' ? ($data['date_peremption'] ?? null) : null,
            'fournisseur' => $data['type'] === 'ENTREE' ? ($data['fournisseur'] ?? null) : null,
            'prix_achat' => $data['type'] === 'ENTREE' ? ($data['prix_achat'] ?? null) : null,
            'motif' => $data['motif'] ?? null,
            'utilisateur' => $request->user()?->name ?: $request->user()?->username,
            'date_mouvement' => $date,
        ]);

        return response()->json([
            'mouvement' => $this->formaterMouvement($mouvement->load('analyse:id,nom')),
            'stockAvant' => $stockAvant,
            'stockApres' => $stockAvant + $quantite,
        ], 201);
    }

    /** Suppression d'un mouvement saisi par erreur (administrateur). */
    public function destroy(string $id)
    {
        StockMouvement::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function updateSeuil(Request $request, string $id)
    {
        $data = $request->validate(['seuil_alerte' => 'nullable|integer|min:0|max:1000000']);

        $analyse = Analyse::where('categorie', self::CATEGORIE)->findOrFail($id);
        $analyse->seuil_alerte = $data['seuil_alerte'] ?? null;
        $analyse->save();

        return response()->json(['analyseId' => $analyse->id, 'seuilAlerte' => $analyse->seuil_alerte]);
    }

    /** Lots recus (entrees avec numero de lot ou date de peremption), du plus proche de la peremption au plus lointain. */
    public function lots()
    {
        $aujourdhui = Carbon::today();
        $limite = $aujourdhui->copy()->addDays(self::JOURS_ALERTE_PEREMPTION);

        $lots = StockMouvement::with('analyse:id,nom')
            ->where('type', 'ENTREE')
            ->where(fn ($q) => $q->whereNotNull('numero_lot')->orWhereNotNull('date_peremption'))
            ->orderByRaw('date_peremption IS NULL, date_peremption ASC')
            ->get()
            ->map(function ($m) use ($aujourdhui, $limite) {
                $statut = match (true) {
                    ! $m->date_peremption => 'SANS_DATE',
                    $m->date_peremption->lt($aujourdhui) => 'PERIME',
                    $m->date_peremption->lte($limite) => 'PROCHE',
                    default => 'OK',
                };

                return $this->formaterMouvement($m) + [
                    'statutPeremption' => $statut,
                    'joursRestants' => $m->date_peremption ? (int) $aujourdhui->diffInDays($m->date_peremption, false) : null,
                ];
            });

        return response()->json(['lots' => $lots, 'joursAlertePeremption' => self::JOURS_ALERTE_PEREMPTION]);
    }

    /** Ventes comptees dans le stock : devis non proforma posterieurs au debut du suivi du medicament. */
    private function ventesQuery()
    {
        $debuts = DB::table('stock_mouvements')
            ->groupBy('analyse_id')
            ->select(['analyse_id', DB::raw('MIN(date_mouvement) as debut')]);

        return DB::table('devis_lignes as l')
            ->join('devis as d', 'd.id', '=', 'l.devis_id')
            ->joinSub($debuts, 'm', 'm.analyse_id', '=', 'l.analyse_id')
            ->where('d.is_proforma', false)
            ->whereColumn('d.date_creation', '>=', 'm.debut');
    }

    private function stockA(string $analyseId, Carbon $date): int
    {
        $mouvements = (int) StockMouvement::where('analyse_id', $analyseId)->where('date_mouvement', '<=', $date)->sum('quantite');
        $ventes = (int) $this->ventesQuery()->where('l.analyse_id', $analyseId)->where('d.date_creation', '<=', $date)->sum('l.quantite');

        return $mouvements - $ventes;
    }

    /** Mouvements manuels et ventes, du plus ancien au plus recent. */
    private function evenements(?string $analyseId, ?Carbon $debut, ?Carbon $fin): Collection
    {
        $manuels = StockMouvement::with('analyse:id,nom')
            ->when($analyseId, fn ($q) => $q->where('analyse_id', $analyseId))
            ->when($debut, fn ($q) => $q->where('date_mouvement', '>=', $debut))
            ->when($fin, fn ($q) => $q->where('date_mouvement', '<=', $fin))
            ->get()
            ->map(fn ($m) => $this->formaterMouvement($m));

        $ventes = $this->ventesQuery()
            ->join('analyses as a', 'a.id', '=', 'l.analyse_id')
            ->leftJoin('patients as p', 'p.id', '=', 'd.patient_id')
            ->when($analyseId, fn ($q) => $q->where('l.analyse_id', $analyseId))
            ->when($debut, fn ($q) => $q->where('d.date_creation', '>=', $debut))
            ->when($fin, fn ($q) => $q->where('d.date_creation', '<=', $fin))
            ->get(['l.id', 'l.analyse_id', 'a.nom', 'l.quantite', 'd.id as devis_id', 'd.numero', 'd.date_creation', 'p.nom_complet', 'p.matricule'])
            ->map(fn ($v) => [
                'id' => 'vente-'.$v->id,
                'source' => 'VENTE',
                'type' => 'VENTE',
                'analyseId' => $v->analyse_id,
                'medicament' => $v->nom,
                'quantite' => -((int) $v->quantite ?: 1),
                'date' => $this->iso($v->date_creation),
                'devisId' => $v->devis_id,
                'devisNumero' => $v->numero,
                'detail' => trim(($v->nom_complet ?? '').($v->matricule ? " ({$v->matricule})" : '')),
                'numeroLot' => null,
                'datePeremption' => null,
                'fournisseur' => null,
                'prixAchat' => null,
                'motif' => null,
                'utilisateur' => null,
            ]);

        return $manuels->concat($ventes)->sortBy('date')->values();
    }

    private function formaterMouvement(StockMouvement $m): array
    {
        return [
            'id' => $m->id,
            'source' => 'STOCK',
            'type' => $m->type,
            'analyseId' => $m->analyse_id,
            'medicament' => $m->analyse?->nom,
            'quantite' => $m->quantite,
            'stockCompte' => $m->stock_compte,
            'date' => $m->date_mouvement?->toIso8601String(),
            'devisId' => null,
            'devisNumero' => null,
            'detail' => $m->fournisseur ?: $m->motif,
            'numeroLot' => $m->numero_lot,
            'datePeremption' => $m->date_peremption?->toDateString(),
            'fournisseur' => $m->fournisseur,
            'prixAchat' => $m->prix_achat !== null ? (float) $m->prix_achat : null,
            'motif' => $m->motif,
            'utilisateur' => $m->utilisateur,
        ];
    }

    private function iso($valeur): ?string
    {
        return $valeur ? Carbon::parse($valeur)->toIso8601String() : null;
    }
}
