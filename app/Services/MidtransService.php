<?php

namespace App\Services;

use App\Models\Order;
use Exception;
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
     * Generate Midtrans Snap Token and Redirect URL for an order
     */
    public function createSnapTransaction(Order $order): array
    {
        $order->loadMissing(['items', 'buyer']);

        $itemDetails = [];
        foreach ($order->items as $item) {
            $itemDetails[] = [
                'id' => (string) $item->product_id,
                'price' => (int) round($item->price),
                'quantity' => (int) $item->quantity,
                'name' => mb_substr($item->product_name, 0, 50),
            ];
        }

        $params = [
            'transaction_details' => [
                'order_id' => $order->order_number,
                'gross_amount' => (int) round($order->total_price),
            ],
            'customer_details' => [
                'first_name' => $order->buyer->name,
                'email' => $order->buyer->email,
                'phone' => $order->buyer->phone ?? '08123456789',
                'shipping_address' => [
                    'first_name' => $order->buyer->name,
                    'address' => $order->delivery_address,
                ],
            ],
            'item_details' => $itemDetails,
        ];

        try {
            $transaction = Snap::createTransaction($params);

            $order->update([
                'snap_token' => $transaction->token ?? null,
                'snap_redirect_url' => $transaction->redirect_url ?? null,
            ]);

            return [
                'snap_token' => $transaction->token ?? null,
                'snap_redirect_url' => $transaction->redirect_url ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Midtrans Snap Error: ' . $e->getMessage(), ['order_id' => $order->id]);
            throw $e;
        }
    }

    /**
     * Handle notification webhook payload from Midtrans
     */
    public function handleNotification(array $payload): Order
    {
        $orderNumber = $payload['order_id'] ?? null;
        $statusCode = $payload['status_code'] ?? null;
        $grossAmount = $payload['gross_amount'] ?? null;
        $signatureKey = $payload['signature_key'] ?? null;
        $serverKey = config('midtrans.server_key');

        // Verify SHA512 Signature Key
        $expectedSignature = hash('sha512', $orderNumber . $statusCode . $grossAmount . $serverKey);

        if ($signatureKey !== $expectedSignature) {
            Log::warning('Midtrans Webhook: Invalid Signature', [
                'order_id' => $orderNumber,
                'received' => $signatureKey,
                'expected' => $expectedSignature,
            ]);
            throw new Exception('Invalid signature key from Midtrans.');
        }

        $order = Order::with('items.product')->where('order_number', $orderNumber)->firstOrFail();

        $transactionStatus = $payload['transaction_status'] ?? null;
        $fraudStatus = $payload['fraud_status'] ?? null;
        $paymentType = $payload['payment_type'] ?? null;

        Log::info("Midtrans Webhook received for {$orderNumber}: status={$transactionStatus}, fraud={$fraudStatus}");

        return DB::transaction(function () use ($order, $transactionStatus, $fraudStatus, $paymentType) {
            $order->payment_type = $paymentType;

            if ($transactionStatus === 'capture') {
                if ($fraudStatus === 'accept') {
                    $order->payment_status = 'paid';
                    $order->order_status = 'processing';
                    $order->paid_at = now();
                } else {
                    $order->payment_status = 'pending';
                }
            } elseif ($transactionStatus === 'settlement') {
                $order->payment_status = 'paid';
                $order->order_status = 'processing';
                $order->paid_at = now();
            } elseif ($transactionStatus === 'pending') {
                $order->payment_status = 'pending';
            } elseif (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
                $order->payment_status = 'failed';
                $order->order_status = 'cancelled';
                $order->cancellation_reason = "Pembayaran Midtrans {$transactionStatus}";
                $order->cancelled_at = now();

                // Restore products stock
                foreach ($order->items as $item) {
                    if ($item->product) {
                        $item->product->increment('stock', $item->quantity);
                        if ($item->product->status === 'out_of_stock') {
                            $item->product->update(['status' => 'active']);
                        }
                    }
                }
            }

            $order->save();

            return $order->fresh(['items', 'buyer', 'cultivator']);
        });
    }
}
