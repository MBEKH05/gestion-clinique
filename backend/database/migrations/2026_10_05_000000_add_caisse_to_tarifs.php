<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Tarifs "Caisse" : une grille de prix unique (type CAISSE), sans entite associee.
return new class extends Migration
{
    public function up(): void
    {
        // Nettoyage d'une premiere version (table caisses + caisse_id) si elle a ete migree.
        if (Schema::hasColumn('patients', 'caisse_id')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->dropForeign(['caisse_id']);
                $table->dropIndex('patients_type_caisse_idx');
                $table->dropColumn('caisse_id');
            });
        }

        if (! DB::table('patients')->where('type_prise_en_charge', 'CAISSE')->exists()) {
            Schema::table('patients', function (Blueprint $table) {
                $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE'])->change();
            });
        }

        if (Schema::hasColumn('tarifs', 'caisse_id')) {
            Schema::table('tarifs', function (Blueprint $table) {
                $table->dropForeign(['caisse_id']);
                $table->dropColumn('caisse_id');
            });
        }

        Schema::dropIfExists('caisses');

        DB::table('migrations')->where('migration', '2026_10_04_000000_create_caisses_table')->delete();

        Schema::table('tarifs', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE', 'CAISSE'])->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('tarifs')->where('type_prise_en_charge', 'CAISSE')->delete();

        Schema::table('tarifs', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE'])->nullable()->change();
        });
    }
};
