<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel panen — menggantikan harvests
     * Mencatat hasil panen aktual dari setiap pengelolaan
     */
    public function up(): void
    {
        Schema::create('panen', function (Blueprint $table) {
            $table->id('id_panen');
            $table->unsignedBigInteger('id_pengelolaan');
            $table->date('tanggal_panen');
            $table->integer('jumlah_panen');
            $table->decimal('berat_panen', 10, 2)->nullable();
            $table->string('kualitas', 50)->nullable();
            $table->dateTime('created_at')->nullable();

            $table->foreign('id_pengelolaan')
                ->references('id_pengelolaan')->on('pengelolaan')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pengelolaan', 'tanggal_panen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panen');
    }
};
