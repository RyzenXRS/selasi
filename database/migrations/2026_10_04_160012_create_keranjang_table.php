<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel keranjang — dipertahankan dari versi lama (tidak ada di ERD baru tapi dibutuhkan)
     * Setiap pembeli memiliki 1 keranjang permanen
     */
    public function up(): void
    {
        Schema::create('keranjang', function (Blueprint $table) {
            $table->id('id_keranjang');
            $table->unsignedBigInteger('id_pembeli')->unique();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();

            $table->foreign('id_pembeli')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('keranjang');
    }
};
