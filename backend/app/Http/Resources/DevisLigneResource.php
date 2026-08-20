<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DevisLigneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'analyseId' => $this->analyse_id,
            'analyse_nom' => optional($this->analyse)->nom,
            'analyse_categorie' => optional($this->analyse)->categorie,
            'prix' => (float) $this->prix,
            'quantite' => (int) $this->quantite,
        ];
    }
}
