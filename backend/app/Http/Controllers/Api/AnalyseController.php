<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AnalyseResource;
use App\Models\Analyse;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AnalyseController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(Analyse::orderBy('nom'), $request, AnalyseResource::class);
    }

    public function store(Request $request)
    {
        $nom = Sanitizer::sanitizeString($request->input('nom', ''), 200);

        if ($nom === '') {
            return response()->json(['detail' => 'Le nom est requis.'], 400);
        }

        $categorie = Sanitizer::sanitizeString($request->input('categorie', 'analyses'), 100);

        $analyse = Analyse::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'nom' => $nom,
            'categorie' => $categorie ?: 'analyses',
        ]);

        return AnalyseResource::make($analyse)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return AnalyseResource::make(Analyse::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $analyse = Analyse::findOrFail($id);

        if ($request->has('nom')) {
            $analyse->nom = Sanitizer::sanitizeString($request->input('nom'), 200);
        }

        if ($request->has('categorie')) {
            $analyse->categorie = Sanitizer::sanitizeString($request->input('categorie'), 100);
        }

        $analyse->save();

        return AnalyseResource::make($analyse);
    }

    public function destroy(string $id)
    {
        Analyse::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
