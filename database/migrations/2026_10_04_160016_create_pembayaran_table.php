<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel pembayaran — BARU, dipisah dari pesanan
     * Menyimpan semua detail gateway Midtrans secara terpisah
     *
     * status_pembayaran: MENUNGGU, LUNAS, GAGAL, KADALUARSA, atau DIBATALKAN
     */
    public function up(): void
    {
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id('id_pembayaran');
            $table->unsignedBigInteger('id_pesanan')->unique();
            $table->unsignedBigInteger('id_pembudidaya')->nullable();
            $table->string('metode_pembayaran', 20)->comment('QRIS atau COD');
            $table->string('status_pembayaran', 30)
                ->default('MENUNGGU')
                ->comment('MENUNGGU, LUNAS, GAGAL, KADALUARSA, atau DIBATALKAN');
            $table->decimal('jumlah_bayar', 12, 2);
            $table->string('order_id_gateway', 100)->unique();
            $table->string('id_transaksi_gateway', 100)->nullable();
            $table->text('qr_string')->nullable();
            $table->text('redirect_url')->nullable();
            $table->string('snap_token', 255)->nullable();
            $table->dateTime('waktu_kadaluarsa')->nullable();
            $table->dateTime('waktu_pembayaran')->nullable();
            $table->text('respons_gateway')->nullable();

            $table->foreign('id_pesanan')
                ->references('id_pesanan')->on('pesanan')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_pembudidaya')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pesanan', 'status_pembayaran']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};
