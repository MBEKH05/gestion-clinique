<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Trace le compte (secretaire / Manager ou Super Admin) qui a enregistre chaque
// patient et chaque devis, pour le rapport d'activite par compte.
// Les enregistrements anterieurs restent a NULL ("non attribues").
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('assurance_id')
                ->constrained('users')->nullOnDelete();
        });

        Schema::table('devis', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('is_proforma')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('devis', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
