<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Plage de consultation d'une specialite pour un jour de la semaine (1 = lundi ... 7 = dimanche). */
class SpecialiteHoraire extends Model
{
    protected $table = 'specialite_horaires';

    public $timestamps = false;

    protected $fillable = [
        'specialite_id',
        'jour',
        'heure_debut',
        'heure_fin',
    ];

    protected function casts(): array
    {
        return [
            'jour' => 'integer',
        ];
    }
}
