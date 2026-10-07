<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class StockMouvement extends Model
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'stock_mouvements';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'analyse_id',
        'type',
        'quantite',
        'stock_compte',
        'numero_lot',
        'date_peremption',
        'fournisseur',
        'prix_achat',
        'motif',
        'utilisateur',
        'date_mouvement',
    ];

    protected function casts(): array
    {
        return [
            'quantite' => 'integer',
            'stock_compte' => 'integer',
            'prix_achat' => 'decimal:2',
            'date_peremption' => 'date',
            'date_mouvement' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function analyse()
    {
        return $this->belongsTo(Analyse::class, 'analyse_id');
    }
}
