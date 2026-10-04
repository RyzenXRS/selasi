<?php

namespace Tests\Feature;

use App\Models\ItemKeranjang;
use App\Models\Keranjang;
use App\Models\Pengguna;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\Stok;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartAndOrderTest extends TestCase
{
    use RefreshDatabase;

    protected Pengguna $cultivator;
    protected Pengguna $buyer;
    protected Produk $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cultivator = Pengguna::factory()->create(['role' => Pengguna::PERAN_PEMBUDIDAYA]);
        $this->buyer      = Pengguna::factory()->create(['role' => Pengguna::PERAN_PEMBELI]);

        $this->product = Produk::create([
            'id_pembudidaya' => $this->cultivator->id_pengguna,
            'nama_produk'    => 'Selada Romaine Segar',
            'harga'          => 15000.00,
            'status_produk'  => true,
        ]);

        Stok::create([
            'id_produk'   => $this->product->id_produk,
            'jumlah_stok' => 50,
        ]);
    }

    public function test_buyer_can_add_item_to_cart(): void
    {
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/keranjang', [
                'id_produk' => $this->product->id_produk,
                'jumlah'    => 3,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.jumlah', 3);

        $this->assertDatabaseHas('item_keranjang', [
            'id_produk' => $this->product->id_produk,
            'jumlah'    => 3,
        ]);
    }

    public function test_buyer_can_checkout(): void
    {
        // Add item to cart first
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/keranjang', [
                'id_produk' => $this->product->id_produk,
                'jumlah'    => 2,
            ]);

        // Checkout
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/pesanan/checkout', [
                'metode_pembayaran' => 'COD',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_harga', 30000);

        // Check stock reduced from 50 to 48
        $this->assertDatabaseHas('stok', [
            'id_produk'   => $this->product->id_produk,
            'jumlah_stok' => 48,
        ]);
    }
}
