<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel produk — menggantikan products
     * Stok dipindahkan ke tabel stok terpisah (normalisasi)
     */
    public function up(): void
    {
        Schema::create('produk', function (Blueprint $table) {
            $table->id('id_produk');
            $table->unsignedBigInteger('id_pembudidaya');
            $table->string('nama_produk', 100);
            $table->text('deskripsi')->nullable();
            $table->decimal('harga', 12, 2);
            $table->string('foto_produk', 255)->nullable();
            $table->boolean('status_produk')->default(true)->comment('true = aktif, false = nonaktif');

            $table->foreign('id_pembudidaya')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pembudidaya', 'status_produk']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produk');
    }
};
