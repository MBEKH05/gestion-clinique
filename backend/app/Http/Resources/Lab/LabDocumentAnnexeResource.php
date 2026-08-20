<?php

namespace App\Http\Resources\Lab;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LabDocumentAnnexeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'titre' => $this->titre,
            'url' => Storage::disk('public')->url($this->chemin),
            'type_mime' => $this->type_mime,
            'taille_octets' => $this->taille_octets,
            'ajoute_par' => $this->ajoutePar?->name,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
