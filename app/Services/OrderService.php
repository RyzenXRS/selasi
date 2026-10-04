<?php

namespace App\Services;

use App\Models\DetailPesanan;
use App\Models\Pembayaran;
use App\Models\Pengguna;
use App\Models\Pesanan;
use App\Models\Stok;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        protected CartService $cartService,
        protected MidtransService $midtransService
    ) {}

    public function checkout(Pengguna $pembeli, array $data): Pesanan
    {
        $cart = $this->cartService->getOrCreateCart($pembeli);
        $cart->load('items.produk.stok');

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => ['Keranjang belanja Anda kosong.'],
            ]);
        }

        $firstItem = $cart->items->first();
        $cultivatorId = $firstItem->produk?->id_pembudidaya;

        foreach ($cart->items as $item) {
            $prodStock = $item->produk?->stok?->jumlah_stok ?? 0;
            if ($prodStock < $item->jumlah) {
                throw ValidationException::withMessages([
                    'stock' => ["Stok untuk produk '{$item->produk?->nama_produk}' tidak cukup."],
                ]);
            }
        }

        $metodePembayaran = strtoupper($data['metode_pembayaran'] ?? $data['payment_method'] ?? 'QRIS');

        return DB::transaction(function () use ($pembeli, $cultivatorId, $cart, $metodePembayaran) {
            $totalHarga = $cart->items->sum(fn($item) => $item->jumlah * ($item->harga_satuan ?? $item->produk?->harga ?? 0));

            $pesanan = Pesanan::create([
                'id_pembeli'        => $pembeli->id_pengguna,
                'tanggal_pesanan'   => Carbon::now(),
                'total_harga'       => $totalHarga,
                'metode_pembayaran' => $metodePembayaran,
                'status_pesanan'    => ($metodePembayaran === 'COD') ? Pesanan::STATUS_DIPROSES : Pesanan::STATUS_MENUNGGU_PEMBAYARAN,
            ]);

            foreach ($cart->items as $item) {
                $harga = (float) ($item->harga_satuan ?? $item->produk?->harga ?? 0);
                DetailPesanan::create([
                    'id_pesanan'   => $pesanan->id_pesanan,
                    'id_produk'    => $item->id_produk,
                    'jumlah'       => $item->jumlah,
                    'harga_satuan' => $harga,
                    'subtotal'     => $item->jumlah * $harga,
                ]);

                // Kurangi stok di tabel stok
                Stok::where('id_produk', $item->id_produk)->decrement('jumlah_stok', $item->jumlah);
            }

            // Catat data pembayaran awal
            Pembayaran::create([
                'id_pesanan'        => $pesanan->id_pesanan,
                'id_pembudidaya'    => $cultivatorId,
                'metode_pembayaran' => $metodePembayaran,
                'status_pembayaran' => ($metodePembayaran === 'COD') ? Pembayaran::STATUS_MENUNGGU : Pembayaran::STATUS_MENUNGGU,
                'jumlah_bayar'      => $totalHarga,
                'order_id_gateway'  => 'ORD-' . $pesanan->id_pesanan . '-' . time(),
                'waktu_kadaluarsa'  => Carbon::now()->addHours(24),
            ]);

            // Kosongkan keranjang
            $this->cartService->clearCart($pembeli);

            $pesanan->load(['detailPesanan.produk', 'pembeli', 'pembayaran']);

            if ($metodePembayaran === 'QRIS' && config('midtrans.server_key')) {
                try {
                    $this->midtransService->createSnapTransaction($pesanan);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Midtrans Snap generation deferred: ' . $e->getMessage());
                }
            }

            return $pesanan->fresh(['detailPesanan.produk', 'pembeli', 'pembayaran']);
        });
    }

    public function updateOrderStatus(Pesanan $pesanan, array $data): Pesanan
    {
        $status = strtoupper($data['status_pesanan'] ?? $data['order_status'] ?? '');

        if ($status === 'DIBATALKAN' || $status === 'CANCELLED') {
            return $this->cancelOrder($pesanan, $data['cancellation_reason'] ?? 'Dibatalkan oleh pembudidaya');
        }

        if ($status === 'SELESAI' || $status === 'COMPLETED') {
            $pesanan->status_pesanan = Pesanan::STATUS_SELESAI;
            if ($pesanan->pembayaran && $pesanan->metode_pembayaran === 'COD') {
                $pesanan->pembayaran->update([
                    'status_pembayaran' => Pembayaran::STATUS_LUNAS,
                    'waktu_pembayaran'  => Carbon::now(),
                ]);
            }
        } elseif (!empty($status)) {
            $pesanan->status_pesanan = $status;
        }

        $pesanan->save();
        return $pesanan->fresh(['detailPesanan.produk', 'pembeli', 'pembayaran']);
    }

    public function cancelOrder(Pesanan $pesanan, string $reason = ''): Pesanan
    {
        if (in_array($pesanan->status_pesanan, [Pesanan::STATUS_SELESAI, Pesanan::STATUS_DIBATALKAN])) {
            throw ValidationException::withMessages([
                'status_pesanan' => ["Pesanan sudah dalam status {$pesanan->status_pesanan} dan tidak dapat dibatalkan."],
            ]);
        }

        return DB::transaction(function () use ($pesanan) {
            // Kembalikan stok
            foreach ($pesanan->detailPesanan as $item) {
                Stok::where('id_produk', $item->id_produk)->increment('jumlah_stok', $item->jumlah);
            }

            $pesanan->update([
                'status_pesanan' => Pesanan::STATUS_DIBATALKAN,
            ]);

            if ($pesanan->pembayaran) {
                $pesanan->pembayaran->update([
                    'status_pembayaran' => Pembayaran::STATUS_DIBATALKAN,
                ]);
            }

            return $pesanan->fresh(['detailPesanan.produk', 'pembeli', 'pembayaran']);
        });
    }
}
