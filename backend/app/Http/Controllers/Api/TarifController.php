<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\TarifResource;
use App\Models\Analyse;
use App\Models\Tarif;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TarifController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(Tarif::orderBy('created_at', 'desc'), $request, TarifResource::class);
    }

    public function store(Request $request)
    {
        $analyseId = $request->input('analyse');

        if (! $analyseId || ! Analyse::whereKey($analyseId)->exists()) {
            return response()->json(['detail' => "L'analyse specifiee est introuvable."], 400);
        }

        $prix = Sanitizer::validateNumeric($request->input('prix', 0), 0, 1000000);

        $type = $request->input('type_prise_en_charge');
        if ($type !== null && ! in_array($type, ['IPM', 'ASSURANCE'], true)) {
            return response()->json(['detail' => 'type_prise_en_charge doit etre IPM ou ASSURANCE.'], 400);
        }

        $tarif = Tarif::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'analyse_id' => $analyseId,
            'type_prise_en_charge' => $type,
            'ipm_id' => $type === 'IPM' ? null : $request->input('ipm'),
            'assurance_id' => $type === 'ASSURANCE' ? null : $request->input('assurance'),
            'prix' => $prix,
        ]);

        return TarifResource::make($tarif)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return TarifResource::make(Tarif::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $tarif = Tarif::findOrFail($id);

        if ($request->has('prix')) {
            $tarif->prix = Sanitizer::validateNumeric($request->input('prix'), 0, 1000000);
        }

        if ($request->has('type_prise_en_charge')) {
            $tarif->type_prise_en_charge = $request->input('type_prise_en_charge');
        }

        if ($request->has('ipm')) {
            $tarif->ipm_id = $request->input('ipm');
        }

        if ($request->has('assurance')) {
            $tarif->assurance_id = $request->input('assurance');
        }

        if ($request->has('analyse')) {
            $tarif->analyse_id = $request->input('analyse');
        }

        $tarif->save();

        return TarifResource::make($tarif);
    }

    public function destroy(string $id)
    {
        Tarif::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
