<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel to_do — menggantikan tasks
     * Daftar tugas harian pembudidaya
     */
    public function up(): void
    {
        Schema::create('to_do', function (Blueprint $table) {
            $table->id('id_todo');
            $table->unsignedBigInteger('id_pembudidaya');
            $table->unsignedBigInteger('id_pengelolaan')->nullable();
            $table->string('nama_tugas', 150);
            $table->date('tanggal_tugas');
            $table->boolean('status')->default(false)->comment('false = belum selesai, true = selesai');
            $table->dateTime('created_at')->nullable();

            $table->foreign('id_pembudidaya')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();
            $table->foreign('id_pengelolaan')
                ->references('id_pengelolaan')->on('pengelolaan')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pembudidaya', 'tanggal_tugas']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('to_do');
    }
};
