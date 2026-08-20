<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class LabUser extends Authenticatable implements JWTSubject
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'lab_users';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'username',
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role' => $this->role,
            'username' => $this->username,
        ];
    }

    public function toUserArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'role' => $this->role,
        ];
    }

    public function dossiersCrees()
    {
        return $this->hasMany(LabDossier::class, 'technicien_id');
    }

    public function dossiersValides()
    {
        return $this->hasMany(LabDossier::class, 'medecin_id');
    }
}
