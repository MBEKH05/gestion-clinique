<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssuranceResource;
use App\Models\Assurance;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssuranceController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(Assurance::orderBy('nom'), $request, AssuranceResource::class);
    }

    public function store(Request $request)
    {
        $nom = Sanitizer::sanitizeString($request->input('nom', ''), 255);

        if ($nom === '') {
            return response()->json(['detail' => 'Le nom est requis.'], 400);
        }

        $assurance = Assurance::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'nom' => $nom,
            'actif' => $request->boolean('actif', true),
        ]);

        return AssuranceResource::make($assurance)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return AssuranceResource::make(Assurance::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $assurance = Assurance::findOrFail($id);

        if ($request->has('nom')) {
            $assurance->nom = Sanitizer::sanitizeString($request->input('nom'), 255);
        }

        if ($request->has('actif')) {
            $assurance->actif = $request->boolean('actif');
        }

        $assurance->save();

        return AssuranceResource::make($assurance);
    }

    public function destroy(string $id)
    {
        Assurance::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function activate(string $id)
    {
        $assurance = Assurance::findOrFail($id);
        $assurance->actif = true;
        $assurance->save();

        return AssuranceResource::make($assurance);
    }

    public function deactivate(string $id)
    {
        $assurance = Assurance::findOrFail($id);
        $assurance->actif = false;
        $assurance->save();

        return AssuranceResource::make($assurance);
    }
}
