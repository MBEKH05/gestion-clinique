<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

// Module Rendez-vous : specialites (avec leurs horaires et creneaux) et
// rendez-vous pris pour une specialite. Une liste de specialites de depart
// est creee ; elle reste modifiable dans l'application.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialites', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom', 100)->unique();
            $table->boolean('actif')->default(true);
            $table->unsignedSmallInteger('duree_creneau')->default(30); // minutes
            $table->time('heure_debut')->default('08:00:00');
            $table->time('heure_fin')->default('17:00:00');
            $table->string('jours', 20)->default('1,2,3,4,5'); // 1 = lundi ... 7 = dimanche
            $table->unsignedTinyInteger('patients_par_creneau')->default(1);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('rendez_vous', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('specialite_id', 50);
            $table->string('patient_id', 50)->nullable();
            $table->string('patient_nom', 200);
            $table->string('telephone', 30)->nullable();
            $table->date('date');
            $table->time('heure');
            $table->string('motif', 255)->nullable();
            $table->string('statut', 20)->default('PREVU');
            $table->timestamp('whatsapp_envoye_le')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('specialite_id')->references('id')->on('specialites')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->nullOnDelete();
            $table->index(['specialite_id', 'date', 'heure'], 'rdv_specialite_creneau_idx');
            $table->index(['date', 'heure'], 'rdv_date_heure_idx');
            $table->index('statut');
        });

        $specialites = [
            'Medecine generale', 'Pediatrie', 'Gynecologie', 'Cardiologie',
            'ORL', 'Ophtalmologie', 'Dermatologie', 'Traumatologie',
        ];
        DB::table('specialites')->insert(array_map(fn ($nom) => [
            'id' => (string) Str::uuid(),
            'nom' => $nom,
            'created_at' => now(),
        ], $specialites));
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous');
        Schema::dropIfExists('specialites');
    }
};
