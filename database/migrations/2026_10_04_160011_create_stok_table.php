<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel stok — BARU, dipisah dari produk
     * One-to-one dengan produk untuk kemudahan update stok secara terpisah
     */
    public function up(): void
    {
        Schema::create('stok', function (Blueprint $table) {
            $table->id('id_stok');
            $table->unsignedBigInteger('id_produk')->unique();
            $table->decimal('jumlah_stok', 10, 2)->default(0);
            $table->dateTime('tanggal_update')->nullable();

            $table->foreign('id_produk')
                ->references('id_produk')->on('produk')
                ->deferrable()->initiallyImmediate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stok');
    }
};
