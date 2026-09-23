<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartAndOrderTest extends TestCase
{
    use RefreshDatabase;

    protected User $cultivator;
    protected User $buyer;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cultivator = User::factory()->create(['role' => 'cultivator']);
        $this->buyer = User::factory()->create(['role' => 'buyer']);

        $this->product = Product::create([
            'user_id' => $this->cultivator->id,
            'name' => 'Selada Romaine Segar',
            'lettuce_type' => 'Romaine',
            'price' => 15000.00,
            'price_unit' => 'ikat',
            'stock' => 50,
            'status' => 'active',
        ]);
    }

    public function test_buyer_can_add_item_to_cart(): void
    {
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->product->id,
                'quantity' => 3,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.quantity', 3);

        $this->assertDatabaseHas('cart_items', [
            'product_id' => $this->product->id,
            'quantity' => 3,
        ]);
    }

    public function test_buyer_can_checkout(): void
    {
        // Add item to cart first
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->product->id,
                'quantity' => 2,
            ]);

        // Checkout
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/orders/checkout', [
                'delivery_address' => 'Jl. Merdeka No. 45, Bandung',
                'payment_method' => 'cod',
                'notes' => 'Tolong kirim sore hari',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_price', 30000)
            ->assertJsonPath('data.payment.method', 'cod');

        // Check stock reduced from 50 to 48
        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'stock' => 48,
        ]);
    }
}
