<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategorieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'nom' => $this->nom,
            'actif' => (bool) $this->actif,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
