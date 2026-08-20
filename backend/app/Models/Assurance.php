<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Assurance extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'assurances';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'nom',
        'actif',
    ];

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function patients()
    {
        return $this->hasMany(Patient::class, 'assurance_id');
    }

    public function tarifs()
    {
        return $this->hasMany(Tarif::class, 'assurance_id');
    }
}
