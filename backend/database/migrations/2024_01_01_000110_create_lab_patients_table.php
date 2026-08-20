<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_patients', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom_complet', 255);
            $table->string('telephone', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('nom_complet');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_patients');
    }
};
