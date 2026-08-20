<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_dossiers', function (Blueprint $table) {
            $table->string('patient_nom', 255)->nullable()->after('lab_patient_id');
            $table->string('numero_client', 100)->nullable()->after('patient_nom');
            $table->string('patient_telephone', 30)->nullable()->after('numero_client');
            $table->string('archive_par_id', 50)->nullable()->after('remis_par_id');
            $table->timestamp('archive_le')->nullable()->after('archive_par_id');

            $table->foreign('archive_par_id')->references('id')->on('lab_users')->nullOnDelete();
        });

        // Backfill depuis lab_patients et l'ancien numero interne (utilise comme
        // numero client de depart pour les dossiers deja existants).
        DB::statement(
            'UPDATE lab_dossiers d
             LEFT JOIN lab_patients p ON p.id = d.lab_patient_id
             SET d.patient_nom = COALESCE(p.nom_complet, "Patient inconnu"),
                 d.patient_telephone = p.telephone,
                 d.numero_client = d.numero'
        );

        DB::statement('UPDATE lab_dossiers SET archive_par_id = remis_par_id, archive_le = remis_le WHERE remis_par_id IS NOT NULL');

        // Elargit l'enum le temps de la conversion des valeurs existantes.
        DB::statement("ALTER TABLE lab_dossiers MODIFY statut ENUM(
            'EN_ATTENTE_AVIS','APPROUVE','REFUSE','PRET_A_REMETTRE','REMIS',
            'EN_ATTENTE','VALIDE_MEDECIN','VALIDE_FINAL','ARCHIVE'
        ) NOT NULL DEFAULT 'EN_ATTENTE_AVIS'");

        DB::statement("UPDATE lab_dossiers SET statut = CASE statut
            WHEN 'EN_ATTENTE_AVIS' THEN 'EN_ATTENTE'
            WHEN 'APPROUVE' THEN 'VALIDE_MEDECIN'
            WHEN 'PRET_A_REMETTRE' THEN 'VALIDE_FINAL'
            WHEN 'REMIS' THEN 'ARCHIVE'
            ELSE statut END");

        DB::statement("ALTER TABLE lab_dossiers MODIFY statut ENUM(
            'EN_ATTENTE','VALIDE_MEDECIN','REFUSE','VALIDE_FINAL','ARCHIVE'
        ) NOT NULL DEFAULT 'EN_ATTENTE'");

        DB::statement('ALTER TABLE lab_dossiers MODIFY patient_nom VARCHAR(255) NOT NULL');
        DB::statement("ALTER TABLE lab_dossiers MODIFY numero_client VARCHAR(100) NOT NULL DEFAULT ''");

        Schema::table('lab_dossiers', function (Blueprint $table) {
            $table->dropForeign(['lab_patient_id']);
            $table->dropUnique(['numero']);
            $table->dropForeign(['remis_par_id']);
            $table->dropColumn(['lab_patient_id', 'numero', 'remis_par_id', 'remis_le']);

            $table->index('numero_client');
        });
    }

    public function down(): void
    {
        Schema::table('lab_dossiers', function (Blueprint $table) {
            $table->string('lab_patient_id', 50)->nullable()->after('numero');
            $table->string('numero', 30)->nullable();
            $table->string('remis_par_id', 50)->nullable();
            $table->timestamp('remis_le')->nullable();
        });

        DB::statement("ALTER TABLE lab_dossiers MODIFY statut ENUM(
            'EN_ATTENTE_AVIS','APPROUVE','REFUSE','PRET_A_REMETTRE','REMIS',
            'EN_ATTENTE','VALIDE_MEDECIN','VALIDE_FINAL','ARCHIVE'
        ) NOT NULL DEFAULT 'EN_ATTENTE_AVIS'");

        DB::statement("UPDATE lab_dossiers SET statut = CASE statut
            WHEN 'EN_ATTENTE' THEN 'EN_ATTENTE_AVIS'
            WHEN 'VALIDE_MEDECIN' THEN 'APPROUVE'
            WHEN 'VALIDE_FINAL' THEN 'PRET_A_REMETTRE'
            WHEN 'ARCHIVE' THEN 'REMIS'
            ELSE statut END");

        DB::statement("ALTER TABLE lab_dossiers MODIFY statut ENUM(
            'EN_ATTENTE_AVIS','APPROUVE','REFUSE','PRET_A_REMETTRE','REMIS'
        ) NOT NULL DEFAULT 'EN_ATTENTE_AVIS'");

        DB::statement('UPDATE lab_dossiers SET numero = numero_client, remis_par_id = archive_par_id, remis_le = archive_le');

        Schema::table('lab_dossiers', function (Blueprint $table) {
            $table->unique('numero');
            $table->foreign('remis_par_id')->references('id')->on('lab_users')->nullOnDelete();
            $table->dropForeign(['archive_par_id']);
            $table->dropColumn(['patient_nom', 'numero_client', 'patient_telephone', 'archive_par_id', 'archive_le']);
        });
    }
};
