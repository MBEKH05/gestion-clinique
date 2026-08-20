<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_dossiers', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('numero', 30)->unique();
            $table->string('lab_patient_id', 50);
            $table->enum('statut', ['EN_ATTENTE_AVIS', 'APPROUVE', 'REFUSE', 'PRET_A_REMETTRE', 'REMIS'])
                ->default('EN_ATTENTE_AVIS');
            $table->text('motif_refus')->nullable();
            $table->string('technicien_id', 50);
            $table->string('medecin_id', 50)->nullable();
            $table->timestamp('valide_le')->nullable();
            $table->string('remis_par_id', 50)->nullable();
            $table->timestamp('remis_le')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('lab_patient_id')->references('id')->on('lab_patients')->cascadeOnDelete();
            $table->foreign('technicien_id')->references('id')->on('lab_users')->restrictOnDelete();
            $table->foreign('medecin_id')->references('id')->on('lab_users')->nullOnDelete();
            $table->foreign('remis_par_id')->references('id')->on('lab_users')->nullOnDelete();

            $table->index(['statut', 'created_at']);
            $table->index('lab_patient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_dossiers');
    }
};
