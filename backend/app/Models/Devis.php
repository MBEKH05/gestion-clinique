<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Devis extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'devis';

    public $timestamps = false;

    protected string $creationTimestampColumn = 'date_creation';

    protected $fillable = [
        'id',
        'numero',
        'patient_id',
        'total',
        'souscripteur',
        'taux_couverture',
        'statut_paiement',
        'date_paiement',
        'commentaire_paiement',
        'is_proforma',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'date_creation' => 'datetime',
            'date_paiement' => 'date',
            'is_proforma' => 'boolean',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function lignes()
    {
        return $this->hasMany(DevisLigne::class, 'devis_id');
    }
}
