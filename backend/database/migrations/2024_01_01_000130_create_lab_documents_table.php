<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_documents', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('lab_dossier_id', 50);
            $table->string('nom_original', 255);
            $table->string('chemin', 500);
            $table->string('type_mime', 100)->nullable();
            $table->unsignedBigInteger('taille_octets')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('lab_dossier_id')->references('id')->on('lab_dossiers')->cascadeOnDelete();
            $table->index('lab_dossier_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_documents');
    }
};
