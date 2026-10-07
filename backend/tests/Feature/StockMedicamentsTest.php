<?php

namespace Tests\Feature;

use App\Models\Analyse;
use App\Models\Devis;
use App\Models\DevisLigne;
use App\Models\Ipm;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StockMedicamentsTest extends TestCase
{
    private Analyse $medoc;

    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        // Seules les migrations utiles (celles du laboratoire contiennent du SQL propre a MySQL).
        foreach ([
            '0001_01_01_000000_create_users_table', '2024_01_01_000010_create_categories_table',
            '2024_01_01_000020_create_analyses_table', '2024_01_01_000030_create_ipms_table',
            '2024_01_01_000040_create_assurances_table', '2024_01_01_000060_create_patients_table',
            '2024_01_01_000070_create_devis_table', '2024_01_01_000080_create_devis_lignes_table',
            '2026_10_07_000000_create_stock_mouvements_table',
        ] as $migration) {
            $this->artisan('migrate', ['--path' => "database/migrations/{$migration}.php"]);
        }

        $this->actingAs(User::create([
            'username' => 'admin', 'name' => 'Admin', 'password' => 'secret', 'is_superuser' => true, 'is_active' => true,
        ]), 'api');

        $this->medoc = Analyse::create(['nom' => 'PARACETAMOL 500', 'categorie' => 'medicament']);
        $ipm = Ipm::create(['nom' => 'IPM TEST', 'actif' => true]);
        $this->patient = Patient::create([
            'nom_complet' => 'Awa Diop', 'matricule' => 'M1', 'type_prise_en_charge' => 'IPM', 'ipm_id' => $ipm->id,
        ]);
    }

    private function vendre(int $quantite, Carbon $date, bool $proforma = false): void
    {
        $devis = (new Devis)->forceFill([
            'numero' => 'DV-'.uniqid(), 'patient_id' => $this->patient->id, 'total' => 100 * $quantite,
            'is_proforma' => $proforma, 'date_creation' => $date,
        ]);
        $devis->save();
        DevisLigne::create(['devis_id' => $devis->id, 'analyse_id' => $this->medoc->id, 'prix' => 100, 'quantite' => $quantite]);
    }

    private function stock(): array
    {
        return collect($this->getJson('/api/stock/medicaments')->assertOk()->json('medicaments'))
            ->firstWhere('analyseId', $this->medoc->id);
    }

    public function test_stock_entrees_ventes_sorties_inventaire(): void
    {
        // Vente avant le debut du suivi : ignoree
        $this->vendre(5, Carbon::now()->subDays(10));
        $this->assertSame('NON_SUIVI', $this->stock()['statut']);

        $this->postJson('/api/stock/mouvements', [
            'analyse_id' => $this->medoc->id, 'type' => 'ENTREE', 'quantite' => 50,
            'numero_lot' => 'LOT-A', 'date_peremption' => Carbon::today()->addDays(30)->toDateString(),
            'date_mouvement' => Carbon::now()->subDays(5)->toDateTimeString(),
        ])->assertCreated()->assertJsonPath('stockApres', 50);

        $this->vendre(8, Carbon::now()->subDays(2));
        $this->vendre(3, Carbon::now()->subDay(), true); // proforma : ignore

        $s = $this->stock();
        $this->assertSame(50, $s['entrees']);
        $this->assertSame(8, $s['vendus']);
        $this->assertSame(42, $s['stock']);
        $this->assertSame('OK', $s['statut']);
        $this->assertTrue($s['peremptionProche']);

        $this->postJson('/api/stock/mouvements', ['analyse_id' => $this->medoc->id, 'type' => 'SORTIE', 'quantite' => 2])
            ->assertStatus(422); // motif obligatoire
        $this->postJson('/api/stock/mouvements', ['analyse_id' => $this->medoc->id, 'type' => 'SORTIE', 'quantite' => 100, 'motif' => 'Casse'])
            ->assertStatus(422); // stock insuffisant
        $this->postJson('/api/stock/mouvements', ['analyse_id' => $this->medoc->id, 'type' => 'SORTIE', 'quantite' => 2, 'motif' => 'Casse'])
            ->assertCreated()->assertJsonPath('stockApres', 40);

        $this->postJson('/api/stock/mouvements', ['analyse_id' => $this->medoc->id, 'type' => 'INVENTAIRE', 'stock_compte' => 37])
            ->assertCreated()->assertJsonPath('mouvement.quantite', -3)->assertJsonPath('stockApres', 37);

        $this->putJson("/api/stock/medicaments/{$this->medoc->id}/seuil", ['seuil_alerte' => 40])->assertOk();
        $s = $this->stock();
        $this->assertSame(37, $s['stock']);
        $this->assertSame('ALERTE', $s['statut']);

        $journal = $this->getJson("/api/stock/mouvements?analyse_id={$this->medoc->id}")->assertOk()->json('mouvements');
        $this->assertSame(['INVENTAIRE', 'SORTIE', 'VENTE', 'ENTREE'], array_column($journal, 'type'));
        $this->assertSame([37, 40, 42, 50], array_column($journal, 'stockApres'));

        $lots = $this->getJson('/api/stock/lots')->assertOk()->json('lots');
        $this->assertSame('PROCHE', $lots[0]['statutPeremption']);
    }
}
