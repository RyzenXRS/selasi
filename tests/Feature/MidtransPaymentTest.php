<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MidtransPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected User $cultivator;
    protected User $buyer;
    protected Product $product;
    protected string $serverKey = 'SB-Mid-server-test-key-12345';

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('midtrans.server_key', $this->serverKey);
        Config::set('midtrans.is_production', false);

        $this->cultivator = User::factory()->create(['role' => 'cultivator']);
        $this->buyer = User::factory()->create(['role' => 'buyer']);

        $this->product = Product::create([
            'user_id' => $this->cultivator->id,
            'name' => 'Selada Butterhead Organik',
            'lettuce_type' => 'Butterhead',
            'price' => 20000.00,
            'stock' => 20,
            'status' => 'active',
        ]);
    }

    public function test_buyer_can_checkout_with_midtrans_payment_method(): void
    {
        // Add to cart
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->product->id,
                'quantity' => 2,
            ]);

        // Checkout with midtrans
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/orders/checkout', [
                'delivery_address' => 'Jl. Dago No. 100, Bandung',
                'payment_method' => 'midtrans',
                'notes' => 'Segera dikirim ya',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.method', 'midtrans')
            ->assertJsonPath('data.order_status', 'waiting_payment');

        $this->assertDatabaseHas('orders', [
            'buyer_id' => $this->buyer->id,
            'payment_method' => 'midtrans',
            'total_price' => 40000.00,
        ]);
    }

    public function test_midtrans_webhook_processes_settlement_successfully(): void
    {
        $order = Order::create([
            'buyer_id' => $this->buyer->id,
            'cultivator_id' => $this->cultivator->id,
            'order_number' => 'ORD-TEST-SETTLEMENT',
            'total_price' => 40000.00,
            'delivery_address' => 'Jl. Dago No. 100',
            'payment_method' => 'midtrans',
            'payment_status' => 'pending',
            'order_status' => 'waiting_payment',
        ]);

        $order->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'lettuce_type' => $this->product->lettuce_type,
            'quantity' => 2,
            'price' => 20000.00,
            'subtotal' => 40000.00,
        ]);

        $statusCode = '200';
        $grossAmount = '40000.00';
        $signature = hash('sha512', $order->order_number . $statusCode . $grossAmount . $this->serverKey);

        $payload = [
            'order_id' => $order->order_number,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'signature_key' => $signature,
            'transaction_status' => 'settlement',
            'payment_type' => 'qris',
            'transaction_time' => now()->toDateTimeString(),
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.status', 'paid')
            ->assertJsonPath('data.order_status', 'processing');

        $this->assertDatabaseHas('orders', [
            'order_number' => $order->order_number,
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'payment_type' => 'qris',
        ]);
    }

    public function test_midtrans_webhook_cancels_order_and_restores_stock_on_expire(): void
    {
        $initialStock = $this->product->stock; // 20

        $order = Order::create([
            'buyer_id' => $this->buyer->id,
            'cultivator_id' => $this->cultivator->id,
            'order_number' => 'ORD-TEST-EXPIRE',
            'total_price' => 60000.00,
            'delivery_address' => 'Jl. Riau No. 12',
            'payment_method' => 'midtrans',
            'payment_status' => 'pending',
            'order_status' => 'waiting_payment',
        ]);

        $order->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'lettuce_type' => $this->product->lettuce_type,
            'quantity' => 3,
            'price' => 20000.00,
            'subtotal' => 60000.00,
        ]);

        // Deduct stock simulating checkout
        $this->product->decrement('stock', 3);
        $this->assertEquals(17, $this->product->fresh()->stock);

        $statusCode = '202';
        $grossAmount = '60000.00';
        $signature = hash('sha512', $order->order_number . $statusCode . $grossAmount . $this->serverKey);

        $payload = [
            'order_id' => $order->order_number,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'signature_key' => $signature,
            'transaction_status' => 'expire',
            'payment_type' => 'bank_transfer',
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.status', 'failed')
            ->assertJsonPath('data.order_status', 'cancelled');

        // Verify stock has been restored to 20
        $this->assertEquals(20, $this->product->fresh()->stock);
    }

    public function test_midtrans_webhook_rejects_invalid_signature(): void
    {
        $payload = [
            'order_id' => 'ORD-FAKE-999',
            'status_code' => '200',
            'gross_amount' => '10000.00',
            'signature_key' => 'invalid_fake_signature_hash',
            'transaction_status' => 'settlement',
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('success', false);
    }
}
