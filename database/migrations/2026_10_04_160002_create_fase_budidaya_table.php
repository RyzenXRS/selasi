<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel master fase budidaya (Semai → Vegetatif → Pendewasaan → Panen)
     */
    public function up(): void
    {
        Schema::create('fase_budidaya', function (Blueprint $table) {
            $table->id('id_fase');
            $table->string('nama_fase', 50)->unique();
            $table->integer('urutan_fase');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fase_budidaya');
    }
};
