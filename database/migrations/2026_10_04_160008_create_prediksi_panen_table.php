<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel prediksi_panen — BARU
     * Menyimpan hasil prediksi AI kapan batch siap panen
     * status_kesiapan: BELUM_SIAP, MENDEKATI_SIAP, atau SIAP
     */
    public function up(): void
    {
        Schema::create('prediksi_panen', function (Blueprint $table) {
            $table->id('id_prediksi_panen');
            $table->unsignedBigInteger('id_pengelolaan');
            $table->string('status_kesiapan', 30)
                ->comment('BELUM_SIAP, MENDEKATI_SIAP, atau SIAP');
            $table->date('perkiraan_tanggal_mulai')->nullable();
            $table->date('perkiraan_tanggal_selesai')->nullable();
            $table->decimal('nilai_prediksi', 10, 2)->nullable();
            $table->dateTime('created_at')->nullable();

            $table->foreign('id_pengelolaan')
                ->references('id_pengelolaan')->on('pengelolaan')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pengelolaan', 'status_kesiapan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediksi_panen');
    }
};
