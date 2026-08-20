<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Analyse extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'analyses';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'nom',
        'categorie',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function tarifs()
    {
        return $this->hasMany(Tarif::class, 'analyse_id');
    }

    public function devisLignes()
    {
        return $this->hasMany(DevisLigne::class, 'analyse_id');
    }
}
