<?php

namespace Database\Seeders;

use App\Models\Categorie;
use Illuminate\Database\Seeder;

class CategorieSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'analyses',
            'radiographie',
            'hospitalisation',
            'maternite',
            'consultations',
            'medicament',
            'autres',
        ];

        foreach ($categories as $nom) {
            Categorie::updateOrCreate(['nom' => $nom], ['actif' => true]);
        }
    }
}
