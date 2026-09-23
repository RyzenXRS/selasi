<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Products are the lettuce varieties sold by cultivators.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // cultivator

            $table->string('name');
            $table->string('lettuce_type', 100);             // e.g., Romaine, Butterhead, Iceberg, Lollo Rosso
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);                 // harga per unit (gram/ikat/kg)
            $table->string('price_unit', 50)->default('ikat'); // satuan harga
            $table->string('image')->nullable();              // path to image file
            $table->unsignedInteger('stock')->default(0);
            $table->enum('status', ['active', 'inactive', 'out_of_stock'])->default('active');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('lettuce_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
