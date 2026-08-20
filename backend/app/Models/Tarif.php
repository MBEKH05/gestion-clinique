<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Tarif extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'tarifs';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'analyse_id',
        'type_prise_en_charge',
        'ipm_id',
        'assurance_id',
        'prix',
    ];

    protected function casts(): array
    {
        return [
            'prix' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function analyse()
    {
        return $this->belongsTo(Analyse::class, 'analyse_id');
    }

    public function ipm()
    {
        return $this->belongsTo(Ipm::class, 'ipm_id');
    }

    public function assurance()
    {
        return $this->belongsTo(Assurance::class, 'assurance_id');
    }
}
