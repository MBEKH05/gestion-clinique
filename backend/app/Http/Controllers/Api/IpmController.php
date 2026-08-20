<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\IpmResource;
use App\Models\Ipm;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IpmController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(Ipm::orderBy('nom'), $request, IpmResource::class);
    }

    public function store(Request $request)
    {
        $nom = Sanitizer::sanitizeString($request->input('nom', ''), 255);

        if ($nom === '') {
            return response()->json(['detail' => 'Le nom est requis.'], 400);
        }

        $ipm = Ipm::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'nom' => $nom,
            'actif' => $request->boolean('actif', true),
        ]);

        return IpmResource::make($ipm)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return IpmResource::make(Ipm::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $ipm = Ipm::findOrFail($id);

        if ($request->has('nom')) {
            $ipm->nom = Sanitizer::sanitizeString($request->input('nom'), 255);
        }

        if ($request->has('actif')) {
            $ipm->actif = $request->boolean('actif');
        }

        $ipm->save();

        return IpmResource::make($ipm);
    }

    public function destroy(string $id)
    {
        Ipm::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function activate(string $id)
    {
        $ipm = Ipm::findOrFail($id);
        $ipm->actif = true;
        $ipm->save();

        return IpmResource::make($ipm);
    }

    public function deactivate(string $id)
    {
        $ipm = Ipm::findOrFail($id);
        $ipm->actif = false;
        $ipm->save();

        return IpmResource::make($ipm);
    }
}
