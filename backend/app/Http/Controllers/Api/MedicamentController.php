<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MedicamentController extends Controller
{
    /**
     * Tracabilite des medicaments vendus (lignes de devis de la categorie "medicament",
     * hors demandes de devis / proformas) : totaux par jour, par medicament et detail de chaque vente.
     */
    public function suivi(Request $request)
    {
        $data = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date',
            'analyse_id' => 'nullable|string',
            'type_prise_en_charge' => 'nullable|in:IPM,ASSURANCE,CAISSE',
        ]);

        $debut = isset($data['date_debut']) ? Carbon::parse($data['date_debut'])->startOfDay() : Carbon::now()->startOfMonth();
        $fin = isset($data['date_fin']) ? Carbon::parse($data['date_fin'])->endOfDay() : Carbon::now()->endOfDay();

        $lignes = DB::table('devis_lignes as l')
            ->join('devis as d', 'd.id', '=', 'l.devis_id')
            ->join('analyses as a', 'a.id', '=', 'l.analyse_id')
            ->leftJoin('patients as p', 'p.id', '=', 'd.patient_id')
            ->leftJoin('ipms as i', 'i.id', '=', 'p.ipm_id')
            ->leftJoin('assurances as s', 's.id', '=', 'p.assurance_id')
            ->where('a.categorie', 'medicament')
            ->where('d.is_proforma', false)
            ->whereBetween('d.date_creation', [$debut, $fin])
            ->when($data['analyse_id'] ?? null, fn ($q, $id) => $q->where('l.analyse_id', $id))
            ->when($data['type_prise_en_charge'] ?? null, fn ($q, $type) => $q->where('p.type_prise_en_charge', $type))
            ->orderBy('d.date_creation', 'desc')
            ->select([
                'l.id',
                'l.analyse_id',
                'a.nom as medicament',
                'l.quantite',
                'l.prix',
                'd.id as devis_id',
                'd.numero as devis_numero',
                'd.date_creation',
                'd.statut_paiement',
                'p.id as patient_id',
                'p.nom_complet as patient_nom',
                'p.matricule',
                'p.type_prise_en_charge',
                'i.nom as ipm_nom',
                's.nom as assurance_nom',
            ])
            ->get();

        $details = $lignes->map(function ($l) {
            $quantite = (int) $l->quantite ?: 1;
            $prix = (float) $l->prix;

            return [
                'id' => $l->id,
                'date' => Carbon::parse($l->date_creation)->toIso8601String(),
                'jour' => Carbon::parse($l->date_creation)->toDateString(),
                'devisId' => $l->devis_id,
                'devisNumero' => $l->devis_numero,
                'patientId' => $l->patient_id,
                'patientNom' => $l->patient_nom,
                'matricule' => $l->matricule,
                'typePriseEnCharge' => $l->type_prise_en_charge,
                'entiteNom' => match ($l->type_prise_en_charge) {
                    'IPM' => $l->ipm_nom,
                    'ASSURANCE' => $l->assurance_nom,
                    'CAISSE' => 'Caisse',
                    default => null,
                },
                'analyseId' => $l->analyse_id,
                'medicament' => $l->medicament,
                'quantite' => $quantite,
                'prixUnitaire' => round($prix, 2),
                'montant' => round($prix * $quantite, 2),
                'statutPaiement' => $l->statut_paiement,
            ];
        });

        $parJour = $details->groupBy('jour')->map(fn ($g, $jour) => [
            'jour' => $jour,
            'quantite' => $g->sum('quantite'),
            'montant' => round($g->sum('montant'), 2),
            'nbMedicaments' => $g->pluck('analyseId')->unique()->count(),
            'nbDevis' => $g->pluck('devisId')->unique()->count(),
        ])->sortByDesc('jour')->values();

        $parMedicament = $details->groupBy('analyseId')->map(fn ($g) => [
            'analyseId' => $g->first()['analyseId'],
            'medicament' => $g->first()['medicament'],
            'quantite' => $g->sum('quantite'),
            'montant' => round($g->sum('montant'), 2),
            'nbDevis' => $g->pluck('devisId')->unique()->count(),
            'nbJours' => $g->pluck('jour')->unique()->count(),
            'derniereVente' => $g->max('date'),
        ])->sortByDesc('quantite')->values();

        return response()->json([
            'periode' => ['debut' => $debut->toDateString(), 'fin' => $fin->toDateString()],
            'resume' => [
                'quantiteTotale' => $details->sum('quantite'),
                'montantTotal' => round($details->sum('montant'), 2),
                'nbMedicaments' => $parMedicament->count(),
                'nbDevis' => $details->pluck('devisId')->unique()->count(),
                'nbPatients' => $details->pluck('patientId')->filter()->unique()->count(),
                'nbJours' => $parJour->count(),
            ],
            'parJour' => $parJour,
            'parMedicament' => $parMedicament,
            'details' => $details->values(),
        ]);
    }
}
