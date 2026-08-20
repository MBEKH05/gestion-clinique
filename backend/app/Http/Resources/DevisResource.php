<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DevisResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero,
            'patient' => $this->patient_id,
            'patient_nom' => optional($this->patient)->nom_complet,
            'patient_matricule' => optional($this->patient)->matricule,
            'total' => (float) $this->total,
            'souscripteur' => $this->souscripteur,
            'taux_couverture' => $this->taux_couverture,
            'date_creation' => optional($this->date_creation)->toIso8601String(),
            'lignes' => DevisLigneResource::collection($this->whenLoaded('lignes')),
            'statut_paiement' => $this->statut_paiement,
            'date_paiement' => optional($this->date_paiement)?->toDateString(),
            'commentaire_paiement' => $this->commentaire_paiement,
            'is_proforma' => (bool) $this->is_proforma,
        ];
    }
}
