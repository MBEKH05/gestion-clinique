<?php

namespace Database\Seeders;

use App\Models\Ipm;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class IpmSeeder extends Seeder
{
    public function run(): void
    {
        $noms = [
            'C2K STAFFING', 'CREDIT MUTUEL', 'FUTUR MEDIA', 'HYDROCARBURE', 'LABOREX',
            'MIMRAN', 'TRANSVIE', 'MBARUM KOOLUTE', 'MUTUEL HOTELIERE', 'ODEC DE DAKAR',
            'POSTE', 'PROFESSIONS LIBERALES', 'SAGAM', 'FILFILI', 'EIFFAGE', 'SANTE PLUS',
            'SEN EAU', 'SENELEC', 'SFD', 'SOCOCIM', 'RIDWAN', 'SOMICOA', 'SONATEL', 'SORES',
            'SYPOA', 'TOP INTER', 'TRANSIT', 'TRANSPORT AERIEN', 'WER GI YARAM', 'DIPROM',
            'ZI SENTENAC',
        ];

        foreach ($noms as $nom) {
            Ipm::firstOrCreate(['nom' => $nom], ['id' => (string) Str::uuid(), 'actif' => true]);
        }
    }
}
