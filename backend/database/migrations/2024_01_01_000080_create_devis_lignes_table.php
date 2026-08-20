<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devis_lignes', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('devis_id', 100);
            $table->string('analyse_id', 50);
            $table->decimal('prix', 15, 2)->default(0);
            $table->unsignedInteger('quantite')->default(1);

            $table->foreign('devis_id')->references('id')->on('devis')->onDelete('cascade');
            $table->foreign('analyse_id')->references('id')->on('analyses')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devis_lignes');
    }
};
