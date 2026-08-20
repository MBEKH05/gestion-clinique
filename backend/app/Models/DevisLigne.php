<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class DevisLigne extends Model
{
    use HasUuidPrimaryKey;

    protected $table = 'devis_lignes';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'devis_id',
        'analyse_id',
        'prix',
        'quantite',
    ];

    protected function casts(): array
    {
        return [
            'prix' => 'decimal:2',
            'quantite' => 'integer',
        ];
    }

    public function devis()
    {
        return $this->belongsTo(Devis::class, 'devis_id');
    }

    public function analyse()
    {
        return $this->belongsTo(Analyse::class, 'analyse_id');
    }
}
