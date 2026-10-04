<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'patients';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'nom_complet',
        'matricule',
        'type_prise_en_charge',
        'ipm_id',
        'assurance_id',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function ipm()
    {
        return $this->belongsTo(Ipm::class, 'ipm_id');
    }

    public function assurance()
    {
        return $this->belongsTo(Assurance::class, 'assurance_id');
    }

    public function devis()
    {
        return $this->hasMany(Devis::class, 'patient_id');
    }
}
