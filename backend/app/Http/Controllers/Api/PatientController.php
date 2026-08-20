<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PatientController extends Controller
{
    use HasLargePagination;

    public function index(Request $request)
    {
        return $this->paginatedResponse(
            Patient::orderBy('created_at', 'desc'),
            $request,
            PatientResource::class,
            1000000
        );
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = Patient::orderBy('created_at', 'desc');

        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('nom_complet', 'like', "%{$q}%")
                    ->orWhere('matricule', 'like', "%{$q}%");
            });
        }

        return $this->paginatedResponse($query, $request, PatientResource::class, 50);
    }

    public function store(Request $request)
    {
        $nomComplet = Sanitizer::sanitizeString($request->input('nom_complet', ''), 200);
        $matricule = Sanitizer::sanitizeString($request->input('matricule', ''), 50);

        if ($nomComplet === '') {
            return response()->json(['detail' => 'Le nom complet est requis.'], 400);
        }

        $type = $request->input('type_prise_en_charge');
        if (! in_array($type, ['IPM', 'ASSURANCE'], true)) {
            return response()->json(['detail' => 'type_prise_en_charge doit etre IPM ou ASSURANCE.'], 400);
        }

        $patient = Patient::create([
            'id' => $request->input('id') ?: (string) Str::uuid(),
            'nom_complet' => $nomComplet,
            'matricule' => $matricule,
            'type_prise_en_charge' => $type,
            'ipm_id' => $request->input('ipm') ?: null,
            'assurance_id' => $request->input('assurance') ?: null,
        ]);

        return PatientResource::make($patient)->response()->setStatusCode(201);
    }

    public function show(string $id)
    {
        return PatientResource::make(Patient::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $patient = Patient::findOrFail($id);

        if ($request->has('nom_complet')) {
            $patient->nom_complet = Sanitizer::sanitizeString($request->input('nom_complet'), 200);
        }

        if ($request->has('matricule')) {
            $patient->matricule = Sanitizer::sanitizeString($request->input('matricule'), 50);
        }

        if ($request->has('type_prise_en_charge')) {
            $patient->type_prise_en_charge = $request->input('type_prise_en_charge');
        }

        if ($request->has('ipm')) {
            $patient->ipm_id = $request->input('ipm') ?: null;
        }

        if ($request->has('assurance')) {
            $patient->assurance_id = $request->input('assurance') ?: null;
        }

        $patient->save();

        return PatientResource::make($patient);
    }

    public function destroy(string $id)
    {
        Patient::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
