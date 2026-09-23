<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase histories track the progression of plants through growth stages.
     */
    public function up(): void
    {
        Schema::create('phase_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('cultivation_batches')->onDelete('cascade');

            // Fase sebelumnya dan berikutnya
            $table->enum('previous_phase', ['Semai', 'Vegetatif', 'Pendewasaan', 'Panen']);
            $table->enum('next_phase', ['Semai', 'Vegetatif', 'Pendewasaan', 'Panen']);

            $table->date('moved_date');                      // tanggal pindah fase
            $table->unsignedInteger('plant_quantity');       // jumlah tanaman yang dipindah
            $table->string('destination_location')->nullable(); // lokasi tujuan
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['batch_id', 'moved_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('phase_histories');
    }
};
