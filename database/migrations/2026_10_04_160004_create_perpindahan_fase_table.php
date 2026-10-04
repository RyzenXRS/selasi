<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel perpindahan_fase — menggantikan phase_histories
     * Mencatat setiap perpindahan fase dalam satu siklus pengelolaan
     */
    public function up(): void
    {
        Schema::create('perpindahan_fase', function (Blueprint $table) {
            $table->id('id_perpindahan');
            $table->unsignedBigInteger('id_pengelolaan');
            $table->unsignedBigInteger('id_fase');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai')->nullable();
            $table->text('catatan')->nullable();

            $table->foreign('id_pengelolaan')
                ->references('id_pengelolaan')->on('pengelolaan')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_fase')
                ->references('id_fase')->on('fase_budidaya')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pengelolaan', 'tanggal_mulai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpindahan_fase');
    }
};
