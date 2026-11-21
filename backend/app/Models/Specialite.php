<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Specialite extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'specialites';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'nom',
        'actif',
        'duree_creneau',
        'heure_debut',
        'heure_fin',
        'jours',
        'patients_par_creneau',
    ];

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
            'duree_creneau' => 'integer',
            'patients_par_creneau' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /** Jours de consultation, 1 = lundi ... 7 = dimanche. */
    public function joursListe(): array
    {
        return array_values(array_filter(array_map('intval', explode(',', (string) $this->jours))));
    }

    public function horaires()
    {
        return $this->hasMany(SpecialiteHoraire::class, 'specialite_id')->orderBy('jour')->orderBy('heure_debut');
    }

    /** Plages de consultation d'un jour (1 = lundi ... 7 = dimanche), triees par heure. */
    public function plagesDuJour(int $jour): array
    {
        return $this->horaires
            ->where('jour', $jour)
            ->map(fn ($h) => ['debut' => substr((string) $h->heure_debut, 0, 5), 'fin' => substr((string) $h->heure_fin, 0, 5)])
            ->sortBy('debut')
            ->values()
            ->all();
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'specialite_id');
    }
}
