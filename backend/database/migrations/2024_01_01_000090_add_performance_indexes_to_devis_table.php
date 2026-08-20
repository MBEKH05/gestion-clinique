<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devis', function (Blueprint $table) {
            $table->index(['is_proforma', 'date_creation'], 'devis_proforma_date_idx');
            $table->index(['patient_id', 'date_creation'], 'devis_patient_date_idx');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->index(['type_prise_en_charge', 'ipm_id'], 'patients_type_ipm_idx');
            $table->index(['type_prise_en_charge', 'assurance_id'], 'patients_type_assurance_idx');
        });
    }

    public function down(): void
    {
        Schema::table('devis', function (Blueprint $table) {
            $table->dropIndex('devis_proforma_date_idx');
            $table->dropIndex('devis_patient_date_idx');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex('patients_type_ipm_idx');
            $table->dropIndex('patients_type_assurance_idx');
        });
    }
};
