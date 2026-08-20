<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_documents_annexes', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('titre', 255);
            $table->string('chemin', 500);
            $table->string('type_mime', 100)->nullable();
            $table->unsignedBigInteger('taille_octets')->default(0);
            $table->string('ajoute_par_id', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('ajoute_par_id')->references('id')->on('lab_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_documents_annexes');
    }
};
