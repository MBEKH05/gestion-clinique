<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class LabDocument extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'lab_documents';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'lab_dossier_id',
        'nom_original',
        'chemin',
        'type_mime',
        'taille_octets',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function dossier()
    {
        return $this->belongsTo(LabDossier::class, 'lab_dossier_id');
    }
}
