<?php
namespace App\Http\Resources\Lab;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
class LabDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $this->chemin)));

        return [
            'id' => $this->id,
            'nom_original' => $this->nom_original,
            'url' => Storage::disk('public')->url($encodedPath),
            'type_mime' => $this->type_mime,
            'taille_octets' => $this->taille_octets,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
