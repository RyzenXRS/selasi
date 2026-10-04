<?php

namespace App\Services;

use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\Stok;
use Exception;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Midtrans\Config;
use Midtrans\Snap;

class MidtransService
{
    public function __construct()
    {
        $this->initMidtrans();
    }

    protected function initMidtrans(): void
    {
        Config::$serverKey = config('midtrans.server_key');
        Config::$isProduction = (bool) config('midtrans.is_production');
        Config::$isSanitized = (bool) config('midtrans.is_sanitized', true);
        Config::$is3ds = (bool) config('midtrans.is_3ds', true);
    }

    /**
     * Generate Midtrans Snap Token and QRIS for an order
     */
    public function createSnapTransaction(Pesanan $pesanan): array
    {
        $pesanan->loadMissing(['detailPesanan.produk', 'pembeli']);

        $itemDetails = [];
        $firstCultivatorId = null;
        foreach ($pesanan->detailPesanan as $item) {
            if (!$firstCultivatorId && $item->produk) {
                $firstCultivatorId = $item->produk->id_pembudidaya;
            }
            $itemDetails[] = [
                'id'       => (string) $item->id_produk,
                'price'    => (int) round($item->harga_satuan),
                'quantity' => (int) $item->jumlah,
                'name'     => mb_substr($item->produk?->nama_produk ?? 'Produk Selada', 0, 50),
            ];
        }

        $orderIdGateway = 'ORDER-' . $pesanan->id_pesanan . '-' . time();

        $params = [
            'transaction_details' => [
                'order_id'     => $orderIdGateway,
                'gross_amount' => (int) round($pesanan->total_harga),
            ],
            'customer_details' => [
                'first_name' => $pesanan->pembeli?->nama ?? 'Pembeli',
                'email'      => $pesanan->pembeli?->email ?? 'buyer@lettuce.com',
                'phone'      => $pesanan->pembeli?->no_telepon ?? '08123456789',
            ],
            'item_details' => $itemDetails,
        ];

        try {
            $transaction = Snap::createTransaction($params);

            $pembayaran = Pembayaran::updateOrInsert(
                ['id_pesanan' => $pesanan->id_pesanan],
                [
                    'id_pembudidaya'       => $firstCultivatorId,
                    'metode_pembayaran'    => $pesanan->metode_pembayaran,
                    'status_pembayaran'    => Pembayaran::STATUS_MENUNGGU,
                    'jumlah_bayar'         => $pesanan->total_harga,
                    'order_id_gateway'     => $orderIdGateway,
                    'snap_token'           => $transaction->token ?? null,
                    'redirect_url'         => $transaction->redirect_url ?? null,
                    'waktu_kadaluarsa'     => Carbon::now()->addHours(24),
                ]
            );

            return [
                'snap_token'        => $transaction->token ?? null,
                'snap_redirect_url' => $transaction->redirect_url ?? null,
                'order_id_gateway'  => $orderIdGateway,
            ];
        } catch (Exception $e) {
            Log::error('Midtrans Snap Error: ' . $e->getMessage(), ['id_pesanan' => $pesanan->id_pesanan]);
            throw $e;
        }
    }

    /**
     * Handle notification webhook payload from Midtrans
     */
    public function handleNotification(array $payload): Pesanan
    {
        $orderIdGateway    = $payload['order_id'] ?? null;
        $statusCode        = $payload['status_code'] ?? null;
        $grossAmount       = $payload['gross_amount'] ?? null;
        $signatureKey      = $payload['signature_key'] ?? null;
        $serverKey         = config('midtrans.server_key');

        $expectedSignature = hash('sha512', $orderIdGateway . $statusCode . $grossAmount . $serverKey);

        if ($signatureKey !== $expectedSignature) {
            Log::warning('Midtrans Webhook: Invalid Signature', [
                'order_id' => $orderIdGateway,
                'received' => $signatureKey,
                'expected' => $expectedSignature,
            ]);
            throw new Exception('Invalid signature key from Midtrans.');
        }

        $pembayaran = Pembayaran::where('order_id_gateway', $orderIdGateway)->firstOrFail();
        $pesanan    = Pesanan::with('detailPesanan.produk')->findOrFail($pembayaran->id_pesanan);

        $transactionStatus = $payload['transaction_status'] ?? null;
        $fraudStatus       = $payload['fraud_status'] ?? null;
        $transactionId     = $payload['transaction_id'] ?? null;

        Log::info("Midtrans Webhook received for {$orderIdGateway}: status={$transactionStatus}, fraud={$fraudStatus}");

        return DB::transaction(function () use ($pembayaran, $pesanan, $transactionStatus, $fraudStatus, $transactionId, $payload) {
            $pembayaran->id_transaksi_gateway = $transactionId;
            $pembayaran->respons_gateway      = $payload;

            if ($transactionStatus === 'capture') {
                if ($fraudStatus === 'accept') {
                    $pembayaran->status_pembayaran = Pembayaran::STATUS_LUNAS;
                    $pembayaran->waktu_pembayaran  = Carbon::now();
                    $pesanan->status_pesanan       = Pesanan::STATUS_DIBAYAR;
                } else {
                    $pembayaran->status_pembayaran = Pembayaran::STATUS_MENUNGGU;
                }
            } elseif ($transactionStatus === 'settlement') {
                $pembayaran->status_pembayaran = Pembayaran::STATUS_LUNAS;
                $pembayaran->waktu_pembayaran  = Carbon::now();
                $pesanan->status_pesanan       = Pesanan::STATUS_DIBAYAR;
            } elseif ($transactionStatus === 'pending') {
                $pembayaran->status_pembayaran = Pembayaran::STATUS_MENUNGGU;
            } elseif (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
                $pembayaran->status_pembayaran = ($transactionStatus === 'expire')
                    ? Pembayaran::STATUS_KADALUARSA
                    : Pembayaran::STATUS_GAGAL;
                $pesanan->status_pesanan = Pesanan::STATUS_DIBATALKAN;

                // Kembalikan stok
                foreach ($pesanan->detailPesanan as $item) {
                    Stok::where('id_produk', $item->id_produk)->increment('jumlah_stok', $item->jumlah);
                }
            }

            $pembayaran->save();
            $pesanan->save();

            return $pesanan->fresh(['detailPesanan.produk', 'pembeli', 'pembayaran']);
        });
    }
}
