<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\CaisseResource;
use App\Models\Caisse;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CaisseController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(Caisse::orderBy('nom'), $request, CaisseResource::class);
    }

    public function store(Request $request)
    {
        $nom = Sanitizer::sanitizeString($request->input('nom', ''), 255);

        if ($nom === '') {
            return response()->json(['detail' => 'Le nom est requis.'], 400);
        }

        $caisse = Caisse::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'nom' => $nom,
            'actif' => $request->boolean('actif', true),
        ]);

        return CaisseResource::make($caisse)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return CaisseResource::make(Caisse::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $caisse = Caisse::findOrFail($id);

        if ($request->has('nom')) {
            $caisse->nom = Sanitizer::sanitizeString($request->input('nom'), 255);
        }

        if ($request->has('actif')) {
            $caisse->actif = $request->boolean('actif');
        }

        $caisse->save();

        return CaisseResource::make($caisse);
    }

    public function destroy(string $id)
    {
        Caisse::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function activate(string $id)
    {
        $caisse = Caisse::findOrFail($id);
        $caisse->actif = true;
        $caisse->save();

        return CaisseResource::make($caisse);
    }

    public function deactivate(string $id)
    {
        $caisse = Caisse::findOrFail($id);
        $caisse->actif = false;
        $caisse->save();

        return CaisseResource::make($caisse);
    }
}
