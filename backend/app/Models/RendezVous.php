<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class RendezVous extends Model
{
    use HasUuidPrimaryKey;

    protected $table = 'rendez_vous';

    // Statuts qui occupent un creneau (un rendez-vous annule le libere).
    public const STATUTS_ACTIFS = ['PREVU', 'CONFIRME', 'VENU', 'ABSENT'];

    public const STATUTS = ['PREVU', 'CONFIRME', 'VENU', 'ABSENT', 'ANNULE'];

    protected $fillable = [
        'id',
        'specialite_id',
        'patient_id',
        'patient_nom',
        'telephone',
        'date',
        'heure',
        'motif',
        'statut',
        'whatsapp_envoye_le',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'whatsapp_envoye_le' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function specialite()
    {
        return $this->belongsTo(Specialite::class, 'specialite_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function createur()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
