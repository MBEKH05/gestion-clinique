<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class LabDossier extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'lab_dossiers';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'patient_nom',
        'numero_client',
        'patient_telephone',
        'statut',
        'motif_refus',
        'technicien_id',
        'medecin_id',
        'valide_le',
        'archive_par_id',
        'archive_le',
    ];

    protected function casts(): array
    {
        return [
            'valide_le' => 'datetime',
            'archive_le' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function documents()
    {
        return $this->hasMany(LabDocument::class, 'lab_dossier_id');
    }

    public function technicien()
    {
        return $this->belongsTo(LabUser::class, 'technicien_id');
    }

    public function medecin()
    {
        return $this->belongsTo(LabUser::class, 'medecin_id');
    }

    public function archivePar()
    {
        return $this->belongsTo(LabUser::class, 'archive_par_id');
    }
}
