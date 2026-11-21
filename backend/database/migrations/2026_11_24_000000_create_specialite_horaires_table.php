<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Horaires des specialites jour par jour, avec une ou plusieurs plages par jour
// (ex. Cardiologie : lundi 08:00-17:00, mardi 15:00-17:00).
// Les horaires actuels (memes heures pour tous les jours de consultation) sont
// recopies sur chaque jour : rien ne change tant qu'ils ne sont pas modifies.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialite_horaires', function (Blueprint $table) {
            $table->id();
            $table->string('specialite_id', 50);
            $table->unsignedTinyInteger('jour'); // 1 = lundi ... 7 = dimanche
            $table->time('heure_debut');
            $table->time('heure_fin');

            $table->foreign('specialite_id')->references('id')->on('specialites')->cascadeOnDelete();
            $table->index(['specialite_id', 'jour']);
        });

        foreach (DB::table('specialites')->get(['id', 'jours', 'heure_debut', 'heure_fin']) as $s) {
            $jours = array_filter(array_map('intval', explode(',', (string) $s->jours)));
            foreach ($jours as $jour) {
                DB::table('specialite_horaires')->insert([
                    'specialite_id' => $s->id,
                    'jour' => $jour,
                    'heure_debut' => $s->heure_debut,
                    'heure_fin' => $s->heure_fin,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('specialite_horaires');
    }
};
