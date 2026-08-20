<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategorieResource;
use App\Models\Analyse;
use App\Models\Categorie;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategorieController extends Controller
{
    public function index()
    {
        $categories = Categorie::orderBy('nom')->get();

        return CategorieResource::collection($categories);
    }

    public function store(Request $request)
    {
        $nom = Sanitizer::sanitizeString($request->input('nom', ''), 50);
        $nom = mb_strtolower(str_replace(' ', '', $nom));

        $request->validate([]);

        if ($nom === '') {
            return response()->json(['detail' => 'Le nom de la categorie est requis.'], 400);
        }

        if (Categorie::where('nom', $nom)->exists()) {
            return response()->json(['detail' => 'Cette categorie existe deja.'], 400);
        }

        $categorie = Categorie::create(['nom' => $nom, 'actif' => true]);

        Analyse::create([
            'id' => (string) Str::uuid(),
            'nom' => "Exemple {$nom}",
            'categorie' => $nom,
        ]);

        return CategorieResource::make($categorie)->response()->setStatusCode(201);
    }

    public function update(Request $request, string $nom)
    {
        $categorie = Categorie::where('nom', $nom)->firstOrFail();

        $nouveauNom = Sanitizer::sanitizeString($request->input('nom', ''), 50);
        $nouveauNom = mb_strtolower(str_replace(' ', '', $nouveauNom));

        if ($nouveauNom === '') {
            return response()->json(['detail' => 'Le nom de la categorie est requis.'], 400);
        }

        if ($nouveauNom !== $categorie->nom && Categorie::where('nom', $nouveauNom)->exists()) {
            return response()->json(['detail' => 'Cette categorie existe deja.'], 400);
        }

        Analyse::where('categorie', $categorie->nom)->update(['categorie' => $nouveauNom]);

        $categorie->delete();
        $categorie = Categorie::create(['nom' => $nouveauNom, 'actif' => true]);

        return CategorieResource::make($categorie);
    }

    public function destroy(string $nom)
    {
        $categorie = Categorie::where('nom', $nom)->firstOrFail();

        $analyseIds = Analyse::where('categorie', $nom)->pluck('id');

        $utilisee = \App\Models\DevisLigne::whereIn('analyse_id', $analyseIds)->exists();

        if ($utilisee) {
            return response()->json([
                'detail' => 'Impossible de supprimer : des analyses de cette categorie sont utilisees dans des devis.',
            ], 400);
        }

        Analyse::where('categorie', $nom)->delete();
        $categorie->delete();

        return response()->json(null, 204);
    }

    public function activate(string $nom)
    {
        $categorie = Categorie::where('nom', $nom)->firstOrFail();
        $categorie->actif = true;
        $categorie->save();

        return CategorieResource::make($categorie);
    }

    public function deactivate(string $nom)
    {
        $categorie = Categorie::where('nom', $nom)->firstOrFail();
        $categorie->actif = false;
        $categorie->save();

        return CategorieResource::make($categorie);
    }
}
