<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tarifs', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('analyse_id', 50);
            $table->enum('type_prise_en_charge', ['IPM', 'ASSURANCE'])->nullable();
            $table->string('ipm_id', 50)->nullable();
            $table->string('assurance_id', 50)->nullable();
            $table->decimal('prix', 15, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('analyse_id')->references('id')->on('analyses')->onDelete('cascade');
            $table->foreign('ipm_id')->references('id')->on('ipms')->onDelete('cascade');
            $table->foreign('assurance_id')->references('id')->on('assurances')->onDelete('cascade');

            $table->index(['type_prise_en_charge']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tarifs');
    }
};
