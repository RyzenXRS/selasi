<?php

namespace Tests\Feature;

use App\Models\DetailPesanan;
use App\Models\Pembayaran;
use App\Models\Pengguna;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\Stok;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MidtransPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected Pengguna $cultivator;
    protected Pengguna $buyer;
    protected Produk $product;
    protected string $serverKey = 'SB-Mid-server-test-key-12345';

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('midtrans.server_key', $this->serverKey);
        Config::set('midtrans.is_production', false);

        $this->cultivator = Pengguna::factory()->create(['role' => Pengguna::PERAN_PEMBUDIDAYA]);
        $this->buyer      = Pengguna::factory()->create(['role' => Pengguna::PERAN_PEMBELI]);

        $this->product = Produk::create([
            'id_pembudidaya' => $this->cultivator->id_pengguna,
            'nama_produk'    => 'Selada Butterhead Organik',
            'harga'          => 20000.00,
            'status_produk'  => true,
        ]);

        Stok::create([
            'id_produk'   => $this->product->id_produk,
            'jumlah_stok' => 20,
        ]);
    }

    public function test_buyer_can_checkout_with_qris_payment_method(): void
    {
        // Add to cart
        $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/keranjang', [
                'id_produk' => $this->product->id_produk,
                'jumlah'    => 2,
            ]);

        // Checkout with QRIS
        $response = $this->actingAs($this->buyer, 'sanctum')
            ->postJson('/api/v1/pesanan/checkout', [
                'metode_pembayaran' => 'QRIS',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.metode_pembayaran', 'QRIS')
            ->assertJsonPath('data.status_pesanan', Pesanan::STATUS_MENUNGGU_PEMBAYARAN);

        $this->assertDatabaseHas('pesanan', [
            'id_pembeli'        => $this->buyer->id_pengguna,
            'metode_pembayaran' => 'QRIS',
            'total_harga'       => 40000.00,
        ]);
    }

    public function test_midtrans_webhook_processes_settlement_successfully(): void
    {
        $pesanan = Pesanan::create([
            'id_pembeli'        => $this->buyer->id_pengguna,
            'tanggal_pesanan'   => now(),
            'total_harga'       => 40000.00,
            'metode_pembayaran' => 'QRIS',
            'status_pesanan'    => Pesanan::STATUS_MENUNGGU_PEMBAYARAN,
        ]);

        DetailPesanan::create([
            'id_pesanan'   => $pesanan->id_pesanan,
            'id_produk'    => $this->product->id_produk,
            'jumlah'       => 2,
            'harga_satuan' => 20000.00,
            'subtotal'     => 40000.00,
        ]);

        $orderIdGateway = 'ORD-TEST-SETTLEMENT';

        Pembayaran::create([
            'id_pesanan'        => $pesanan->id_pesanan,
            'id_pembudidaya'    => $this->cultivator->id_pengguna,
            'metode_pembayaran' => 'QRIS',
            'status_pembayaran' => Pembayaran::STATUS_MENUNGGU,
            'jumlah_bayar'      => 40000.00,
            'order_id_gateway'  => $orderIdGateway,
        ]);

        $statusCode = '200';
        $grossAmount = '40000.00';
        $signature = hash('sha512', $orderIdGateway . $statusCode . $grossAmount . $this->serverKey);

        $payload = [
            'order_id'           => $orderIdGateway,
            'status_code'        => $statusCode,
            'gross_amount'       => $grossAmount,
            'signature_key'      => $signature,
            'transaction_status' => 'settlement',
            'transaction_id'     => 'TRX-12345',
            'payment_type'       => 'qris',
            'transaction_time'   => now()->toDateTimeString(),
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.status', Pembayaran::STATUS_LUNAS)
            ->assertJsonPath('data.status_pesanan', Pesanan::STATUS_DIBAYAR);

        $this->assertDatabaseHas('pembayaran', [
            'order_id_gateway'  => $orderIdGateway,
            'status_pembayaran' => Pembayaran::STATUS_LUNAS,
        ]);
    }

    public function test_midtrans_webhook_cancels_order_and_restores_stock_on_expire(): void
    {
        $pesanan = Pesanan::create([
            'id_pembeli'        => $this->buyer->id_pengguna,
            'tanggal_pesanan'   => now(),
            'total_harga'       => 60000.00,
            'metode_pembayaran' => 'QRIS',
            'status_pesanan'    => Pesanan::STATUS_MENUNGGU_PEMBAYARAN,
        ]);

        DetailPesanan::create([
            'id_pesanan'   => $pesanan->id_pesanan,
            'id_produk'    => $this->product->id_produk,
            'jumlah'       => 3,
            'harga_satuan' => 20000.00,
            'subtotal'     => 60000.00,
        ]);

        $orderIdGateway = 'ORD-TEST-EXPIRE';

        Pembayaran::create([
            'id_pesanan'        => $pesanan->id_pesanan,
            'id_pembudidaya'    => $this->cultivator->id_pengguna,
            'metode_pembayaran' => 'QRIS',
            'status_pembayaran' => Pembayaran::STATUS_MENUNGGU,
            'jumlah_bayar'      => 60000.00,
            'order_id_gateway'  => $orderIdGateway,
        ]);

        // Deduct stock simulating checkout (20 - 3 = 17)
        Stok::where('id_produk', $this->product->id_produk)->decrement('jumlah_stok', 3);
        $this->assertEquals(17, Stok::where('id_produk', $this->product->id_produk)->value('jumlah_stok'));

        $statusCode = '202';
        $grossAmount = '60000.00';
        $signature = hash('sha512', $orderIdGateway . $statusCode . $grossAmount . $this->serverKey);

        $payload = [
            'order_id'           => $orderIdGateway,
            'status_code'        => $statusCode,
            'gross_amount'       => $grossAmount,
            'signature_key'      => $signature,
            'transaction_status' => 'expire',
            'payment_type'       => 'bank_transfer',
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.status', Pembayaran::STATUS_KADALUARSA)
            ->assertJsonPath('data.status_pesanan', Pesanan::STATUS_DIBATALKAN);

        // Verify stock has been restored to 20
        $this->assertEquals(20, Stok::where('id_produk', $this->product->id_produk)->value('jumlah_stok'));
    }

    public function test_midtrans_webhook_rejects_invalid_signature(): void
    {
        $payload = [
            'order_id'           => 'ORD-FAKE-999',
            'status_code'        => '200',
            'gross_amount'       => '10000.00',
            'signature_key'      => 'invalid_fake_signature_hash',
            'transaction_status' => 'settlement',
        ];

        $response = $this->postJson('/api/v1/midtrans/callback', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('success', false);
    }
}
