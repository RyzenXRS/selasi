<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel pesanan — menggantikan orders
     * Detail pembayaran (Midtrans) dipisah ke tabel pembayaran
     *
     * status_pesanan: MENUNGGU_PEMBAYARAN, DIBAYAR, DIPROSES, SIAP_DIAMBIL, SELESAI, DIBATALKAN
     */
    public function up(): void
    {
        Schema::create('pesanan', function (Blueprint $table) {
            $table->id('id_pesanan');
            $table->unsignedBigInteger('id_pembeli');
            $table->dateTime('tanggal_pesanan')->nullable();
            $table->decimal('total_harga', 12, 2);
            $table->string('metode_pembayaran', 20)->comment('QRIS atau COD');
            $table->string('status_pesanan', 30)
                ->default('MENUNGGU_PEMBAYARAN')
                ->comment('MENUNGGU_PEMBAYARAN, DIBAYAR, DIPROSES, SIAP_DIAMBIL, SELESAI, atau DIBATALKAN');

            $table->foreign('id_pembeli')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pembeli', 'status_pesanan']);
            $table->index('tanggal_pesanan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan');
    }
};
