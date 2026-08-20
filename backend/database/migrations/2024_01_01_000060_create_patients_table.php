<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom_complet', 255);
            $table->string('matricule', 100);
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE']);
            $table->string('ipm_id', 50)->nullable();
            $table->string('assurance_id', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('ipm_id')->references('id')->on('ipms')->nullOnDelete();
            $table->foreign('assurance_id')->references('id')->on('assurances')->nullOnDelete();

            $table->index('nom_complet');
            $table->index('matricule');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
