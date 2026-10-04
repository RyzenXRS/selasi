<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel prediksi_permintaan — BARU
     * Prediksi AI untuk permintaan pasar per periode, membantu perencanaan produksi
     */
    public function up(): void
    {
        Schema::create('prediksi_permintaan', function (Blueprint $table) {
            $table->id('id_prediksi_permintaan');
            $table->unsignedBigInteger('id_pembudidaya');
            $table->date('periode_mulai');
            $table->date('periode_selesai');
            $table->date('tanggal_prediksi');
            $table->decimal('hasil_prediksi', 10, 2);
            $table->string('satuan', 20)->nullable()->comment('kg, ikat, gram');
            $table->dateTime('created_at')->nullable();

            $table->foreign('id_pembudidaya')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pembudidaya', 'periode_mulai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediksi_permintaan');
    }
};
