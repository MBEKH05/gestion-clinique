<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Gestion de stock des medicaments : journal des mouvements manuels (entrees, sorties, inventaires).
// Les ventes ne sont pas dupliquees ici : elles sont lues dans les lignes de devis.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_mouvements', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('analyse_id', 50);
            $table->enum('type', ['ENTREE', 'SORTIE', 'INVENTAIRE']);
            // Variation du stock : positive pour une entree, negative pour une sortie,
            // ecart (compte - theorique) pour un inventaire.
            $table->integer('quantite');
            $table->unsignedInteger('stock_compte')->nullable();
            $table->string('numero_lot', 100)->nullable();
            $table->date('date_peremption')->nullable();
            $table->string('fournisseur', 255)->nullable();
            $table->decimal('prix_achat', 15, 2)->nullable();
            $table->string('motif', 255)->nullable();
            $table->string('utilisateur', 150)->nullable();
            $table->timestamp('date_mouvement')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('analyse_id')->references('id')->on('analyses')->onDelete('cascade');

            $table->index(['analyse_id', 'date_mouvement']);
            $table->index('date_peremption');
        });

        Schema::table('analyses', function (Blueprint $table) {
            $table->unsignedInteger('seuil_alerte')->nullable()->after('categorie');
        });
    }

    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropColumn('seuil_alerte');
        });

        Schema::dropIfExists('stock_mouvements');
    }
};
