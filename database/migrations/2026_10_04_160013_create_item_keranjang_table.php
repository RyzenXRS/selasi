<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel item_keranjang — menggantikan cart_items
     * Detail produk yang ada di keranjang belanja
     */
    public function up(): void
    {
        Schema::create('item_keranjang', function (Blueprint $table) {
            $table->id('id_item_keranjang');
            $table->unsignedBigInteger('id_keranjang');
            $table->unsignedBigInteger('id_produk');
            $table->integer('jumlah');
            $table->decimal('harga_satuan', 12, 2);
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();

            $table->foreign('id_keranjang')
                ->references('id_keranjang')->on('keranjang')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_produk')
                ->references('id_produk')->on('produk')
                ->deferrable()->initiallyImmediate();

            $table->unique(['id_keranjang', 'id_produk']);
            $table->index('id_keranjang');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_keranjang');
    }
};
