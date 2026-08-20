<?php

namespace Database\Seeders;

use App\Models\Assurance;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AssuranceSeeder extends Seeder
{
    public function run(): void
    {
        $noms = [
            'ASCOMA', 'SANLAM', 'SONAM', 'PA', 'SUNU', 'AMSA', 'NSIA', 'WAFA', 'OLEA',
            'WILLIS TOWERS WATSON',
        ];

        foreach ($noms as $nom) {
            Assurance::firstOrCreate(['nom' => $nom], ['id' => (string) Str::uuid(), 'actif' => true]);
        }
    }
}
