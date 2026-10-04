<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel notifikasi — menggantikan notifications (Laravel generic)
     * Notifikasi domain-spesifik untuk pembudidaya dan pembeli
     */
    public function up(): void
    {
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id('id_notifikasi');
            $table->unsignedBigInteger('id_pengguna');
            $table->unsignedBigInteger('id_pengelolaan')->nullable();
            $table->string('jenis_notifikasi', 30)
                ->comment('PENGINGAT_FASE, PREDIKSI_PANEN, BATAS_UMUR_PANEN, atau lainnya');
            $table->text('isi_notifikasi');
            $table->boolean('status_dibaca')->default(false);
            $table->dateTime('waktu_notifikasi')->nullable();

            $table->foreign('id_pengguna')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_pengelolaan')
                ->references('id_pengelolaan')->on('pengelolaan')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pengguna', 'status_dibaca']);
            $table->index('waktu_notifikasi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi');
    }
};
