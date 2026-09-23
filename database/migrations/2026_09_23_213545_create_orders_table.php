<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Orders represent a buyer's checkout transaction.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('cultivator_id')->constrained('users')->onDelete('cascade');

            $table->string('order_number')->unique();        // e.g., ORD-20260923-001
            $table->decimal('total_price', 12, 2);

            // Delivery details
            $table->text('delivery_address');               // snapshot alamat pengiriman
            $table->text('notes')->nullable();

            // Payment
            $table->enum('payment_method', ['qris', 'cod']);
            $table->enum('payment_status', ['pending', 'paid', 'failed'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_proof')->nullable();    // bukti pembayaran (QRIS screenshot)

            // Order lifecycle
            $table->enum('order_status', [
                'waiting_payment',
                'processing',
                'ready_pickup',
                'completed',
                'cancelled',
            ])->default('waiting_payment');

            $table->string('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['buyer_id', 'order_status']);
            $table->index(['cultivator_id', 'order_status']);
            $table->index('payment_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
