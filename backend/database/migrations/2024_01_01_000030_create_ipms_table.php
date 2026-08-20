<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipms', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('nom', 255);
            $table->boolean('actif')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('nom');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipms');
    }
};
