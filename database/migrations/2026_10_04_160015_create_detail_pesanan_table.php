<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel detail_pesanan — menggantikan order_items
     * Detail produk dalam setiap pesanan
     */
    public function up(): void
    {
        Schema::create('detail_pesanan', function (Blueprint $table) {
            $table->id('id_detail_pesanan');
            $table->unsignedBigInteger('id_pesanan');
            $table->unsignedBigInteger('id_produk');
            $table->integer('jumlah');
            $table->decimal('harga_satuan', 12, 2);
            $table->decimal('subtotal', 12, 2);

            $table->foreign('id_pesanan')
                ->references('id_pesanan')->on('pesanan')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_produk')
                ->references('id_produk')->on('produk')
                ->deferrable()->initiallyImmediate();

            $table->index('id_pesanan');
            $table->index('id_produk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detail_pesanan');
    }
};
