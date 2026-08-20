<?php

namespace Database\Seeders;

use App\Models\Analyse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AnalyseSeeder extends Seeder
{
    public function run(): void
    {
        $analyses = [
            'analyses' => [
                'NFS', 'VS', 'Glycemie', 'Creatinine', 'Cholesterol total', 'Serologie VIH',
                'Groupe sanguin', 'Uree', 'Transaminases (ASAT/ALAT)', 'CRP',
            ],
            'radiographie' => [
                'Radiographie thorax', 'Echographie abdominale', 'Echographie pelvienne',
            ],
            'hospitalisation' => [
                "Journee d'hospitalisation - chambre commune", "Journee d'hospitalisation - chambre privee",
            ],
            'maternite' => [
                'Accouchement normal', 'Consultation prenatale',
            ],
            'consultations' => [
                'Consultation generaliste', 'Consultation specialiste',
            ],
            'medicament' => [
                'Paracetamol', 'Amoxicilline',
            ],
        ];

        foreach ($analyses as $categorie => $noms) {
            foreach ($noms as $nom) {
                Analyse::firstOrCreate(
                    ['nom' => $nom, 'categorie' => $categorie],
                    ['id' => (string) Str::uuid()]
                );
            }
        }
    }
}
