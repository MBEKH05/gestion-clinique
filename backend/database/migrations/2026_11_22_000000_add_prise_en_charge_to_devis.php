<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Chaque devis garde sa propre prise en charge (Caisse / IPM / assurance) au
// moment ou il est etabli. Avant, les factures mensuelles et les statistiques
// passaient par la fiche ACTUELLE du patient : quand le patient changeait de
// prise en charge, ses anciens devis quittaient leur facture.
//
// Les devis existants sont remplis avec la prise en charge actuelle de leur
// patient (aucun historique n'existe). Les devis deja deplaces peuvent ensuite
// etre retrouves avec : php artisan devis:reattribuer
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devis', function (Blueprint $table) {
            $table->string('type_prise_en_charge', 20)->nullable()->after('taux_couverture');
            $table->string('ipm_id', 50)->nullable()->after('type_prise_en_charge');
            $table->string('assurance_id', 50)->nullable()->after('ipm_id');

            $table->foreign('ipm_id')->references('id')->on('ipms')->nullOnDelete();
            $table->foreign('assurance_id')->references('id')->on('assurances')->nullOnDelete();
            $table->index(['type_prise_en_charge', 'ipm_id', 'date_creation'], 'devis_pec_ipm_date_idx');
            $table->index(['type_prise_en_charge', 'assurance_id', 'date_creation'], 'devis_pec_assurance_date_idx');
        });

        DB::statement("
            UPDATE devis d
            JOIN patients p ON p.id = d.patient_id
            SET d.type_prise_en_charge = p.type_prise_en_charge,
                d.ipm_id = CASE WHEN p.type_prise_en_charge = 'IPM' THEN p.ipm_id ELSE NULL END,
                d.assurance_id = CASE WHEN p.type_prise_en_charge = 'ASSURANCE' THEN p.assurance_id ELSE NULL END
        ");
    }

    public function down(): void
    {
        Schema::table('devis', function (Blueprint $table) {
            $table->dropForeign(['ipm_id']);
            $table->dropForeign(['assurance_id']);
            $table->dropIndex('devis_pec_ipm_date_idx');
            $table->dropIndex('devis_pec_assurance_date_idx');
            $table->dropColumn(['type_prise_en_charge', 'ipm_id', 'assurance_id']);
        });
    }
};
