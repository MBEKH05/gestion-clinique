<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devis', function (Blueprint $table) {
            $table->string('id', 100)->primary();
            $table->string('numero', 20)->unique();
            $table->string('patient_id', 50);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('souscripteur', 255)->nullable();
            $table->string('taux_couverture', 10)->nullable();
            $table->timestamp('date_creation')->useCurrent();
            $table->enum('statut_paiement', ['NON_REGLE', 'PARTIELLEMENT_REGLE', 'REGLE'])->default('NON_REGLE');
            $table->date('date_paiement')->nullable();
            $table->text('commentaire_paiement')->nullable();
            $table->boolean('is_proforma')->default(false);

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');

            $table->index('date_creation');
            $table->index('is_proforma');
            $table->index('statut_paiement');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devis');
    }
};
