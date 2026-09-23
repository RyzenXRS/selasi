<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Cultivation checks record daily monitoring data — this is the primary AI dataset.
     */
    public function up(): void
    {
        Schema::create('cultivation_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('cultivation_batches')->onDelete('cascade');

            $table->date('check_date');                         // tanggal pengecekan

            // Kondisi tanaman
            $table->enum('plant_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');

            // Pengukuran air & nutrisi
            $table->decimal('water_ph', 4, 2)->nullable();       // pH air (6.0 - 7.0 ideal)
            $table->unsignedSmallInteger('tds_ppm')->nullable();  // TDS ppm (800-1200 ideal)
            $table->decimal('temperature', 5, 2)->nullable();     // suhu °C

            // Kondisi instalasi
            $table->enum('installation_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['batch_id', 'check_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cultivation_checks');
    }
};
