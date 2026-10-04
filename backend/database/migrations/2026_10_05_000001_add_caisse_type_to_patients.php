<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Un patient peut etre pris en charge par la Caisse (aucune IPM / assurance associee).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE', 'CAISSE'])->change();
        });
    }

    public function down(): void
    {
        DB::table('patients')->where('type_prise_en_charge', 'CAISSE')->update(['type_prise_en_charge' => 'ASSURANCE']);

        Schema::table('patients', function (Blueprint $table) {
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE'])->change();
        });
    }
};
