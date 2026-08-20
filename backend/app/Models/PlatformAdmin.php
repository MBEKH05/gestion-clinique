<?php

namespace App\Models;

use App\Models\Concerns\AutoSetsCreationTimestamp;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class PlatformAdmin extends Authenticatable implements JWTSubject
{
    use HasUuidPrimaryKey, AutoSetsCreationTimestamp;

    protected $table = 'platform_admins';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'username',
        'name',
        'password',
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
            'username' => $this->username,
        ];
    }

    public function toUserArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'role' => 'administration',
        ];
    }
}
