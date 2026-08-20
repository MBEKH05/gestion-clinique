<?php

namespace App\Http\Resources\Lab;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabDossierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'statut' => $this->statut,
            'motif_refus' => $this->motif_refus,
            'patient_nom' => $this->patient_nom,
            'numero_client' => $this->numero_client,
            'patient_telephone' => $this->patient_telephone,
            'technicien' => [
                'id' => $this->technicien?->id,
                'name' => $this->technicien?->name,
            ],
            'medecin' => $this->medecin ? [
                'id' => $this->medecin->id,
                'name' => $this->medecin->name,
            ] : null,
            'valide_le' => optional($this->valide_le)->toIso8601String(),
            'archive_par' => $this->archivePar ? [
                'id' => $this->archivePar->id,
                'name' => $this->archivePar->name,
            ] : null,
            'archive_le' => optional($this->archive_le)->toIso8601String(),
            'documents' => LabDocumentResource::collection($this->whenLoaded('documents')),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
