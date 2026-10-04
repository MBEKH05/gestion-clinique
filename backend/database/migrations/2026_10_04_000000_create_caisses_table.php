<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ajoute la "Caisse" comme troisieme type de prise en charge (a cote d'IPM et Assurance).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caisses', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom', 255);
            $table->boolean('actif')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('nom');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE', 'CAISSE'])->change();
            $table->string('caisse_id', 50)->nullable()->after('assurance_id');

            $table->foreign('caisse_id')->references('id')->on('caisses')->nullOnDelete();
            $table->index(['type_prise_en_charge', 'caisse_id'], 'patients_type_caisse_idx');
        });

        Schema::table('tarifs', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE', 'CAISSE'])->nullable()->change();
            $table->string('caisse_id', 50)->nullable()->after('assurance_id');

            $table->foreign('caisse_id')->references('id')->on('caisses')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('tarifs', function (Blueprint $table) {
            $table->dropForeign(['caisse_id']);
            $table->dropColumn('caisse_id');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['caisse_id']);
            $table->dropIndex('patients_type_caisse_idx');
            $table->dropColumn('caisse_id');
        });

        Schema::dropIfExists('caisses');
    }
};
