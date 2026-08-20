<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_users', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('username', 100)->unique();
            $table->string('name', 255);
            $table->string('password');
            $table->enum('role', ['technicien', 'medecin', 'secretaire', 'administrateur']);
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_users');
    }
};
