<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RendezVous;
use App\Models\Specialite;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SpecialiteController extends Controller
{
    public function index()
    {
        return response()->json(Specialite::with('horaires')->orderBy('nom')->get()->map(fn ($s) => $this->format($s)));
    }

    public function store(Request $request)
    {
        $data = $this->valider($request);

        if (Specialite::where('nom', $data['specialite']['nom'])->exists()) {
            return response()->json(['detail' => 'Cette specialite existe deja.'], 400);
        }

        $specialite = DB::transaction(function () use ($data) {
            $specialite = Specialite::create($data['specialite'] + ['actif' => true]);
            $this->enregistrerHoraires($specialite, $data['horaires']);

            return $specialite;
        });

        return response()->json($this->format($specialite->load('horaires')), 201);
    }

    public function update(Request $request, string $id)
    {
        $specialite = Specialite::findOrFail($id);
        $data = $this->valider($request, $specialite);

        if (Specialite::where('nom', $data['specialite']['nom'])->whereKeyNot($id)->exists()) {
            return response()->json(['detail' => 'Cette specialite existe deja.'], 400);
        }

        if ($request->has('actif')) {
            $data['specialite']['actif'] = $request->boolean('actif');
        }

        DB::transaction(function () use ($specialite, $data) {
            $specialite->update($data['specialite']);
            $this->enregistrerHoraires($specialite, $data['horaires']);
        });

        return response()->json($this->format($specialite->load('horaires')));
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

    /**
     * Horaires : liste de plages {jour (1 = lundi ... 7 = dimanche), debut, fin},
     * plusieurs plages possibles le meme jour (sans chevauchement).
     */
    private function valider(Request $request, ?Specialite $specialite = null): array
    {
        $data = $request->validate([
            'nom' => 'required|string|max:100',
            'duree_creneau' => 'required|integer|min:5|max:240',
            'patients_par_creneau' => 'required|integer|min:1|max:50',
            'horaires' => 'required|array|min:1',
            'horaires.*.jour' => ['required', 'integer', Rule::in([1, 2, 3, 4, 5, 6, 7])],
            'horaires.*.debut' => 'required|date_format:H:i',
            'horaires.*.fin' => 'required|date_format:H:i',
        ], [
            'horaires.required' => 'Choisissez au moins un jour de consultation.',
            'horaires.min' => 'Choisissez au moins un jour de consultation.',
        ]);

        $jours = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        $plages = collect($data['horaires'])
            ->map(fn ($h) => ['jour' => (int) $h['jour'], 'debut' => $h['debut'], 'fin' => $h['fin']])
            ->sortBy(fn ($h) => $h['jour'].' '.$h['debut'])
            ->values();

        foreach ($plages as $h) {
            if ($h['fin'] <= $h['debut']) {
                throw ValidationException::withMessages(['horaires' => "Le {$jours[$h['jour']]}, l'heure de fin ({$h['fin']}) doit etre apres l'heure de debut ({$h['debut']})."]);
            }
        }
        foreach ($plages->groupBy('jour') as $jour => $duJour) {
            for ($k = 1; $k < $duJour->count(); $k++) {
                if ($duJour[$k]['debut'] < $duJour[$k - 1]['fin']) {
                    throw ValidationException::withMessages(['horaires' => "Le {$jours[$jour]}, les plages {$duJour[$k - 1]['debut']}-{$duJour[$k - 1]['fin']} et {$duJour[$k]['debut']}-{$duJour[$k]['fin']} se chevauchent."]);
                }
            }
        }

        return [
            'specialite' => [
                'nom' => Sanitizer::sanitizeString($data['nom'], 100),
                'duree_creneau' => (int) $data['duree_creneau'],
                'patients_par_creneau' => (int) $data['patients_par_creneau'],
                // Anciennes colonnes gardees a jour (resume des horaires).
                'jours' => $plages->pluck('jour')->unique()->implode(','),
                'heure_debut' => $plages->min('debut').':00',
                'heure_fin' => $plages->max('fin').':00',
            ],
            'horaires' => $plages->all(),
        ];
    }

    private function enregistrerHoraires(Specialite $specialite, array $plages): void
    {
        $specialite->horaires()->delete();
        foreach ($plages as $h) {
            $specialite->horaires()->create([
                'jour' => $h['jour'],
                'heure_debut' => $h['debut'].':00',
                'heure_fin' => $h['fin'].':00',
            ]);
        }
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
            'jours' => $s->horaires->pluck('jour')->unique()->values()->all(),
            'horaires' => $s->horaires->map(fn ($h) => [
                'jour' => (int) $h->jour,
                'debut' => substr((string) $h->heure_debut, 0, 5),
                'fin' => substr((string) $h->heure_fin, 0, 5),
            ])->values()->all(),
            'patientsParCreneau' => (int) $s->patients_par_creneau,
        ];
    }

    private function format(Specialite $s): array
    {
        return self::formatStatic($s);
    }
}
