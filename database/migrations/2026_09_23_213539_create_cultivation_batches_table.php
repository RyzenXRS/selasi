<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Cultivation batches represent a complete growing cycle from seeding to harvest.
     */
    public function up(): void
    {
        Schema::create('cultivation_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            $table->string('batch_code')->unique();         // e.g., BATCH-2026-001
            $table->date('seed_date');                      // tanggal semai
            $table->unsignedInteger('plant_quantity');      // jumlah tanaman
            $table->string('current_phase', 50);           // Semai, Vegetatif, Pendewasaan, Panen
            $table->string('location')->nullable();         // lokasi instalasi

            // Kondisi (1-5 scale atau enum)
            $table->enum('plant_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');
            $table->enum('water_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');
            $table->enum('nutrition_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');
            $table->enum('installation_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');
            $table->enum('environment_condition', ['sangat_baik', 'baik', 'cukup', 'buruk', 'kritis'])
                ->default('baik');

            $table->text('notes')->nullable();

            // Batch status
            $table->enum('status', ['normal', 'attention', 'near_phase_change', 'near_harvest', 'harvested'])
                ->default('normal');

            $table->timestamp('harvested_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('current_phase');
            $table->index('seed_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cultivation_batches');
    }
};
