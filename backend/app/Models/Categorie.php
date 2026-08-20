<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use Illuminate\Database\Eloquent\Model;

class Categorie extends Model
{
    use AutoSetsCreationTimestamp;

    protected $table = 'categories';

    protected $primaryKey = 'nom';

    public $incrementing = false;

    protected $keyType = 'string';

    const UPDATED_AT = null;

    public $timestamps = false;

    protected $fillable = [
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

    public function analyses()
    {
        return $this->hasMany(Analyse::class, 'categorie', 'nom');
    }
}
