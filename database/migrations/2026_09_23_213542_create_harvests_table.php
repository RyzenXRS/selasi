<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Harvests record actual harvest results — critical AI dataset for harvest prediction.
     */
    public function up(): void
    {
        Schema::create('harvests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('cultivation_batches')->onDelete('cascade');

            $table->date('harvest_date');
            $table->unsignedInteger('quantity');             // jumlah tanaman dipanen
            $table->decimal('weight', 8, 2);                 // berat total dalam gram
            $table->enum('condition', ['sangat_baik', 'baik', 'cukup', 'buruk'])
                ->default('baik');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['batch_id', 'harvest_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('harvests');
    }
};
