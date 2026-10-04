<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nom_complet' => $this->nom_complet,
            'matricule' => $this->matricule,
            'type_prise_en_charge' => $this->type_prise_en_charge,
            'ipm' => $this->ipm_id,
            'assurance' => $this->assurance_id,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
