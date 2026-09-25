<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method')->default('midtrans')->change();
            $table->string('payment_type')->nullable()->after('payment_method'); // e.g. qris, bank_transfer, gopay
            $table->string('snap_token')->nullable()->after('payment_proof');
            $table->text('snap_redirect_url')->nullable()->after('snap_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'snap_token', 'snap_redirect_url']);
        });
    }
};
