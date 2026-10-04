<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel pengelolaan — menggantikan cultivation_batches
     * Satu pengelolaan = satu siklus tanam dari semai hingga panen
     */
    public function up(): void
    {
        Schema::create('pengelolaan', function (Blueprint $table) {
            $table->id('id_pengelolaan');
            $table->unsignedBigInteger('id_pembudidaya');
            $table->string('kode_pengelolaan', 50)->unique();
            $table->date('tanggal_tanam');
            $table->integer('jumlah_tanaman');
            $table->string('lokasi', 100)->nullable();
            $table->text('kondisi_tanaman')->nullable();
            $table->text('kondisi_air_nutrisi')->nullable();
            $table->text('kondisi_instalasi')->nullable();
            $table->text('kondisi_lingkungan')->nullable();
            $table->decimal('nilai_ph', 4, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->string('status', 20)
                ->default('AKTIF')
                ->comment('AKTIF, SELESAI, atau GAGAL');
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();

            $table->foreign('id_pembudidaya')
                ->references('id_pengguna')->on('pengguna')
                ->deferrable()->initiallyImmediate();

            $table->index(['id_pembudidaya', 'status']);
            $table->index('tanggal_tanam');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengelolaan');
    }
};
