<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RendezVous;
use App\Models\Specialite;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SpecialiteController extends Controller
{
    public function index()
    {
        return response()->json(Specialite::orderBy('nom')->get()->map(fn ($s) => $this->format($s)));
    }

    public function store(Request $request)
    {
        $data = $this->valider($request);

        if (Specialite::where('nom', $data['nom'])->exists()) {
            return response()->json(['detail' => 'Cette specialite existe deja.'], 400);
        }

        $specialite = Specialite::create($data + ['actif' => true]);

        return response()->json($this->format($specialite), 201);
    }

    public function update(Request $request, string $id)
    {
        $specialite = Specialite::findOrFail($id);
        $data = $this->valider($request, $specialite);

        if (Specialite::where('nom', $data['nom'])->whereKeyNot($id)->exists()) {
            return response()->json(['detail' => 'Cette specialite existe deja.'], 400);
        }

        if ($request->has('actif')) {
            $data['actif'] = $request->boolean('actif');
        }

        $specialite->update($data);

        return response()->json($this->format($specialite));
    }

    public function destroy(string $id)
    {
        $specialite = Specialite::findOrFail($id);

        if (RendezVous::where('specialite_id', $id)->exists()) {
            return response()->json([
                'detail' => 'Cette specialite a des rendez-vous et ne peut pas etre supprimee. Desactivez-la a la place.',
            ], 409);
        }

        $specialite->delete();

        return response()->json(null, 204);
    }

    private function valider(Request $request, ?Specialite $specialite = null): array
    {
        $data = $request->validate([
            'nom' => 'required|string|max:100',
            'duree_creneau' => 'required|integer|min:5|max:240',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
            'jours' => 'required|array|min:1',
            'jours.*' => ['integer', Rule::in([1, 2, 3, 4, 5, 6, 7])],
            'patients_par_creneau' => 'required|integer|min:1|max:50',
        ], [
            'heure_fin.after' => "L'heure de fin doit etre apres l'heure de debut.",
            'jours.required' => 'Choisissez au moins un jour de consultation.',
        ]);

        $jours = array_values(array_unique(array_map('intval', $data['jours'])));
        sort($jours);

        return [
            'nom' => Sanitizer::sanitizeString($data['nom'], 100),
            'duree_creneau' => (int) $data['duree_creneau'],
            'heure_debut' => $data['heure_debut'] . ':00',
            'heure_fin' => $data['heure_fin'] . ':00',
            'jours' => implode(',', $jours),
            'patients_par_creneau' => (int) $data['patients_par_creneau'],
        ];
    }

    public static function formatStatic(Specialite $s): array
    {
        return [
            'id' => $s->id,
            'nom' => $s->nom,
            'actif' => (bool) $s->actif,
            'dureeCreneau' => (int) $s->duree_creneau,
            'heureDebut' => substr((string) $s->heure_debut, 0, 5),
            'heureFin' => substr((string) $s->heure_fin, 0, 5),
            'jours' => $s->joursListe(),
            'patientsParCreneau' => (int) $s->patients_par_creneau,
        ];
    }

    private function format(Specialite $s): array
    {
        return self::formatStatic($s);
    }
}
