<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel ulasan — menggantikan reviews
     * Satu pembeli hanya bisa memberi 1 ulasan per produk per pesanan
     */
    public function up(): void
    {
        Schema::create('ulasan', function (Blueprint $table) {
            $table->id('id_ulasan');
            $table->unsignedBigInteger('id_produk');
            $table->unsignedBigInteger('id_pembeli');
            $table->unsignedBigInteger('id_pesanan');
            $table->integer('rating')->comment('Nilai 1 hingga 5');
            $table->text('komentar')->nullable();
            $table->dateTime('tanggal_ulasan')->nullable();

            $table->foreign('id_produk')
                ->references('id_produk')->on('produk')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_pembeli')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_pesanan')
                ->references('id_pesanan')->on('pesanan')
                ->deferrable()->initiallyImmediate();

            $table->unique(['id_produk', 'id_pembeli', 'id_pesanan'], 'ulasan_unik');
            $table->index('id_produk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ulasan');
    }
};
