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

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'specialite_id');
    }
}
