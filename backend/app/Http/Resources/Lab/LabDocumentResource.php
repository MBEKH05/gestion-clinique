<?php

namespace App\Http\Resources\Lab;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LabDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nom_original' => $this->nom_original,
            'url' => Storage::disk('public')->url($this->chemin),
            'type_mime' => $this->type_mime,
            'taille_octets' => $this->taille_octets,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
