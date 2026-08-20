<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analyses', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom', 500);
            $table->string('categorie', 50)->default('analyses');
            $table->timestamp('created_at')->useCurrent();

            $table->index('nom');
            $table->index('categorie');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analyses');
    }
};
