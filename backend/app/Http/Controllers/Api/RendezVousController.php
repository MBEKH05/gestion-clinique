<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\Specialite;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RendezVousController extends Controller
{
    /** Rendez-vous d'une periode (par defaut aujourd'hui), filtres par specialite / statut / recherche. */
    public function index(Request $request)
    {
        $data = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date',
            'specialite_id' => 'nullable|string',
            'statut' => ['nullable', Rule::in(RendezVous::STATUTS)],
            'search' => 'nullable|string|max:100',
        ]);

        $debut = Carbon::parse($data['date_debut'] ?? now())->toDateString();
        $fin = Carbon::parse($data['date_fin'] ?? $debut)->toDateString();
        $search = trim((string) ($data['search'] ?? ''));

        $liste = RendezVous::with(['specialite', 'createur:id,username,name'])
            ->whereBetween('date', [$debut, $fin])
            ->when($data['specialite_id'] ?? null, fn ($q, $v) => $q->where('specialite_id', $v))
            ->when($data['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('patient_nom', 'like', "%{$search}%")
                ->orWhere('telephone', 'like', "%{$search}%")))
            ->orderBy('date')
            ->orderBy('heure')
            ->limit(2000)
            ->get();

        return response()->json([
            'periode' => ['debut' => $debut, 'fin' => $fin],
            'resultats' => $liste->map(fn ($r) => $this->format($r)),
        ]);
    }

    public function show(string $id)
    {
        return response()->json($this->format(RendezVous::with(['specialite', 'createur:id,username,name'])->findOrFail($id)));
    }

    /** Creneaux d'une specialite pour une date, avec le nombre de places prises. */
    public function creneaux(Request $request)
    {
        $data = $request->validate([
            'specialite_id' => 'required|string|exists:specialites,id',
            'date' => 'required|date',
            'exclure' => 'nullable|string', // rendez-vous en cours de deplacement
        ]);

        $specialite = Specialite::findOrFail($data['specialite_id']);
        $date = Carbon::parse($data['date'])->startOfDay();

        return response()->json($this->calculerCreneaux($specialite, $date, $data['exclure'] ?? null));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'specialite_id' => 'required|string|exists:specialites,id',
            'date' => 'required|date',
            'heure' => 'required|date_format:H:i',
            'patient_id' => 'nullable|string|exists:patients,id',
            'patient_nom' => 'nullable|string|max:200',
            'telephone' => 'nullable|string|max:30',
            'motif' => 'nullable|string|max:255',
        ]);

        $patientNom = Sanitizer::sanitizeString($data['patient_nom'] ?? '', 200);
        if ($patientNom === '' && ! empty($data['patient_id'])) {
            $patientNom = (string) Patient::whereKey($data['patient_id'])->value('nom_complet');
        }
        if ($patientNom === '') {
            return response()->json(['detail' => 'Le nom du patient est requis.'], 422);
        }

        return DB::transaction(function () use ($data, $patientNom, $request) {
            $specialite = Specialite::whereKey($data['specialite_id'])->lockForUpdate()->firstOrFail();
            $erreur = $this->verifierCreneau($specialite, $data['date'], $data['heure']);
            if ($erreur) {
                return response()->json(['detail' => $erreur], 422);
            }

            $rdv = RendezVous::create([
                'specialite_id' => $specialite->id,
                'patient_id' => $data['patient_id'] ?? null,
                'patient_nom' => $patientNom,
                'telephone' => $this->nettoyerTelephone($data['telephone'] ?? null),
                'date' => Carbon::parse($data['date'])->toDateString(),
                'heure' => $data['heure'] . ':00',
                'motif' => Sanitizer::sanitizeString($data['motif'] ?? '', 255) ?: null,
                'statut' => 'PREVU',
                'created_by' => $request->user()?->id,
            ]);

            return response()->json($this->format($rdv->load(['specialite', 'createur:id,username,name'])), 201);
        });
    }

    /** Modifier un rendez-vous : deplacer (date / heure / specialite), telephone, motif. */
    public function update(Request $request, string $id)
    {
        $rdv = RendezVous::findOrFail($id);

        $data = $request->validate([
            'specialite_id' => 'sometimes|string|exists:specialites,id',
            'date' => 'sometimes|date',
            'heure' => 'sometimes|date_format:H:i',
            'patient_nom' => 'sometimes|string|max:200',
            'patient_id' => 'sometimes|nullable|string|exists:patients,id',
            'telephone' => 'sometimes|nullable|string|max:30',
            'motif' => 'sometimes|nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($rdv, $data) {
            $specialiteId = $data['specialite_id'] ?? $rdv->specialite_id;
            $date = $data['date'] ?? $rdv->date->toDateString();
            $heure = $data['heure'] ?? substr((string) $rdv->heure, 0, 5);
            $deplace = $specialiteId !== $rdv->specialite_id
                || Carbon::parse($date)->toDateString() !== $rdv->date->toDateString()
                || $heure !== substr((string) $rdv->heure, 0, 5);

            if ($deplace) {
                $specialite = Specialite::whereKey($specialiteId)->lockForUpdate()->firstOrFail();
                $erreur = $this->verifierCreneau($specialite, $date, $heure, $rdv->id);
                if ($erreur) {
                    return response()->json(['detail' => $erreur], 422);
                }
                $rdv->specialite_id = $specialiteId;
                $rdv->date = Carbon::parse($date)->toDateString();
                $rdv->heure = $heure . ':00';
                if (in_array($rdv->statut, ['ANNULE', 'ABSENT'], true)) {
                    $rdv->statut = 'PREVU';
                }
                $rdv->whatsapp_envoye_le = null; // nouvelle date : la confirmation est a renvoyer
            }

            if (array_key_exists('patient_nom', $data)) {
                $nom = Sanitizer::sanitizeString($data['patient_nom'], 200);
                if ($nom === '') {
                    return response()->json(['detail' => 'Le nom du patient est requis.'], 422);
                }
                $rdv->patient_nom = $nom;
            }
            // Rattache le rendez-vous a la fiche patient (ex. apres le devis du patient).
            if (array_key_exists('patient_id', $data)) {
                $rdv->patient_id = $data['patient_id'];
            }
            if (array_key_exists('telephone', $data)) {
                $rdv->telephone = $this->nettoyerTelephone($data['telephone']);
            }
            if (array_key_exists('motif', $data)) {
                $rdv->motif = Sanitizer::sanitizeString($data['motif'] ?? '', 255) ?: null;
            }

            $rdv->save();

            return response()->json($this->format($rdv->load(['specialite', 'createur:id,username,name'])));
        });
    }

    public function updateStatut(Request $request, string $id)
    {
        $data = $request->validate(['statut' => ['required', Rule::in(RendezVous::STATUTS)]]);
        $rdv = RendezVous::findOrFail($id);

        // Reactiver un rendez-vous annule reprend une place : verifier qu'il en reste.
        if ($rdv->statut === 'ANNULE' && $data['statut'] !== 'ANNULE') {
            $erreur = DB::transaction(function () use ($rdv) {
                $specialite = Specialite::whereKey($rdv->specialite_id)->lockForUpdate()->firstOrFail();

                return $this->verifierCreneau($specialite, $rdv->date->toDateString(), substr((string) $rdv->heure, 0, 5), $rdv->id, false);
            });
            if ($erreur) {
                return response()->json(['detail' => $erreur], 422);
            }
        }

        $rdv->statut = $data['statut'];
        $rdv->save();

        return response()->json($this->format($rdv->load(['specialite', 'createur:id,username,name'])));
    }

    /** Note l'heure du dernier message WhatsApp ouvert pour ce rendez-vous. */
    public function whatsapp(string $id)
    {
        $rdv = RendezVous::findOrFail($id);
        $rdv->whatsapp_envoye_le = now();
        $rdv->save();

        return response()->json($this->format($rdv->load(['specialite', 'createur:id,username,name'])));
    }

    private function calculerCreneaux(Specialite $specialite, Carbon $date, ?string $exclure = null): array
    {
        $ouvert = $specialite->actif && in_array($date->isoWeekday(), $specialite->joursListe(), true);

        $pris = RendezVous::where('specialite_id', $specialite->id)
            ->whereDate('date', $date->toDateString())
            ->whereIn('statut', RendezVous::STATUTS_ACTIFS)
            ->when($exclure, fn ($q) => $q->whereKeyNot($exclure))
            ->get(['heure'])
            ->countBy(fn ($r) => substr((string) $r->heure, 0, 5));

        $creneaux = [];
        if ($ouvert) {
            $heure = $date->copy()->setTimeFromTimeString((string) $specialite->heure_debut);
            $fin = $date->copy()->setTimeFromTimeString((string) $specialite->heure_fin);
            $maintenant = now();
            while ($heure->copy()->addMinutes($specialite->duree_creneau)->lte($fin)) {
                $h = $heure->format('H:i');
                $nb = (int) ($pris[$h] ?? 0);
                $creneaux[] = [
                    'heure' => $h,
                    'pris' => $nb,
                    'capacite' => (int) $specialite->patients_par_creneau,
                    'passe' => $heure->lt($maintenant),
                    'libre' => $nb < $specialite->patients_par_creneau && $heure->gte($maintenant),
                ];
                $heure->addMinutes($specialite->duree_creneau);
            }
        }

        return [
            'specialite' => SpecialiteController::formatStatic($specialite),
            'date' => $date->toDateString(),
            'ouvert' => $ouvert,
            'creneaux' => $creneaux,
        ];
    }

    /** Retourne un message d'erreur si le creneau n'est pas reservable, sinon null. */
    private function verifierCreneau(Specialite $specialite, string $date, string $heure, ?string $exclure = null, bool $verifierPasse = true): ?string
    {
        if (! $specialite->actif) {
            return 'Cette specialite est desactivee.';
        }

        $planning = $this->calculerCreneaux($specialite, Carbon::parse($date)->startOfDay(), $exclure);
        if (! $planning['ouvert']) {
            return "Pas de consultation de {$specialite->nom} ce jour-la.";
        }

        $creneau = collect($planning['creneaux'])->firstWhere('heure', $heure);
        if (! $creneau) {
            return "L'heure {$heure} ne correspond a aucun creneau de {$specialite->nom}.";
        }
        if ($verifierPasse && $creneau['passe']) {
            return 'Ce creneau est deja passe.';
        }
        if ($creneau['pris'] >= $creneau['capacite']) {
            return 'Ce creneau est complet. Choisissez une autre heure.';
        }

        return null;
    }

    private function nettoyerTelephone(?string $telephone): ?string
    {
        $tel = preg_replace('/[^\d+]/', '', (string) $telephone);

        return $tel === '' ? null : substr($tel, 0, 30);
    }

    private function format(RendezVous $r): array
    {
        return [
            'id' => $r->id,
            'specialiteId' => $r->specialite_id,
            'specialite' => $r->specialite?->nom,
            'patientId' => $r->patient_id,
            'patientNom' => $r->patient_nom,
            'telephone' => $r->telephone,
            'date' => $r->date?->toDateString(),
            'heure' => substr((string) $r->heure, 0, 5),
            'motif' => $r->motif,
            'statut' => $r->statut,
            'whatsappEnvoyeLe' => $r->whatsapp_envoye_le?->toIso8601String(),
            'creePar' => $r->createur ? ($r->createur->name ?: $r->createur->username) : null,
            'creeLe' => $r->created_at?->toIso8601String(),
        ];
    }
}
