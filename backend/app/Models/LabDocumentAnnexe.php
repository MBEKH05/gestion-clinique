<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class LabDocumentAnnexe extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'lab_documents_annexes';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'titre',
        'chemin',
        'type_mime',
        'taille_octets',
        'ajoute_par_id',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function ajoutePar()
    {
        return $this->belongsTo(LabUser::class, 'ajoute_par_id');
    }
}
