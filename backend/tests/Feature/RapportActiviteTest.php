<?php

namespace Tests\Feature;

use App\Models\Analyse;
use App\Models\Devis;
use App\Models\Ipm;
use App\Models\Patient;
use App\Models\User;
use Tests\TestCase;

class RapportActiviteTest extends TestCase
{
    private User $admin;

    private User $secA;

    private User $secB;

    private Ipm $ipm;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table', '2024_01_01_000010_create_categories_table',
            '2024_01_01_000020_create_analyses_table', '2024_01_01_000030_create_ipms_table',
            '2024_01_01_000040_create_assurances_table', '2024_01_01_000050_create_tarifs_table',
            '2024_01_01_000060_create_patients_table',
            '2024_01_01_000070_create_devis_table', '2024_01_01_000080_create_devis_lignes_table',
            '2026_11_10_000000_add_created_by_to_patients_and_devis',
        ] as $migration) {
            $this->artisan('migrate', ['--path' => "database/migrations/{$migration}.php"]);
        }

        $this->admin = User::create(['username' => 'admin', 'password' => 'x', 'is_superuser' => true, 'is_active' => true]);
        $this->secA = User::create(['username' => 'awa', 'password' => 'x', 'is_superuser' => false, 'is_active' => true]);
        $this->secB = User::create(['username' => 'binta', 'password' => 'x', 'is_superuser' => false, 'is_active' => true]);
        $this->ipm = Ipm::create(['nom' => 'IPM TEST', 'actif' => true]);
    }

    private function creerPatient(User $u, string $nom): string
    {
        return $this->actingAs($u, 'api')->postJson('/api/patients', [
            'nom_complet' => $nom, 'matricule' => 'M-'.$nom, 'type_prise_en_charge' => 'IPM', 'ipm' => $this->ipm->id,
        ])->assertCreated()->json('id');
    }

    public function test_creation_enregistre_le_compte_et_rapport_personnel(): void
    {
        $p1 = $this->creerPatient($this->secA, 'Patient Un');
        $this->creerPatient($this->secA, 'Patient Deux');
        $this->creerPatient($this->secB, 'Patient Trois');
        Patient::create(['nom_complet' => 'Ancien', 'matricule' => 'OLD', 'type_prise_en_charge' => 'CAISSE']);

        $this->assertSame($this->secA->id, (int) Patient::find($p1)->created_by);

        (new Devis)->forceFill([
            'numero' => 'DV-1', 'patient_id' => $p1, 'total' => 10000, 'taux_couverture' => '20',
            'is_proforma' => false, 'created_by' => $this->secA->id,
        ])->save();
        (new Devis)->forceFill([
            'numero' => 'DV-2', 'patient_id' => $p1, 'total' => 5000, 'is_proforma' => true, 'created_by' => $this->secA->id,
        ])->save();

        $res = $this->actingAs($this->secA, 'api')->getJson('/api/rapport-activite')->assertOk();
        $res->assertJsonPath('compte.username', 'awa')
            ->assertJsonPath('totaux.patients', 2)
            ->assertJsonPath('totaux.patientsParType.IPM', 2)
            ->assertJsonPath('totaux.devis', 1)
            ->assertJsonPath('devis.0.entiteNom', 'IPM TEST');
        $this->assertEquals(8000, $res->json('totaux.partCouverte'));
        $this->assertEquals(2000, $res->json('totaux.partPatient'));

        // Un Manager ne peut pas consulter le rapport d'un autre compte.
        $this->actingAs($this->secA, 'api')->getJson('/api/rapport-activite?user_id='.$this->secB->id)
            ->assertOk()->assertJsonPath('compte.username', 'awa');
        $this->actingAs($this->secA, 'api')->getJson('/api/rapport-activite/resume')->assertForbidden();

        // Le Super Admin voit tout.
        $this->actingAs($this->admin, 'api')->getJson('/api/rapport-activite?user_id='.$this->secB->id)
            ->assertOk()->assertJsonPath('totaux.patients', 1);

        $resume = $this->actingAs($this->admin, 'api')->getJson('/api/rapport-activite/resume')->assertOk();
        $comptes = collect($resume->json('comptes'))->keyBy('username');
        $this->assertSame(2, $comptes['awa']['patients']);
        $this->assertSame(1, $comptes['awa']['devis']);
        $this->assertSame(1, $comptes['binta']['patients']);
        $resume->assertJsonPath('nonAttribues.patients', 1);
    }
}
