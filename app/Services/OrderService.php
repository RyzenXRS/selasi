<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        protected CartService $cartService,
        protected MidtransService $midtransService
    ) {}

    public function checkout(User $buyer, array $data): Order
    {
        $cart = $this->cartService->getOrCreateCart($buyer);
        $cart->load('items.product');

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => ['Keranjang belanja Anda kosong.'],
            ]);
        }

        // Group items by cultivator (user_id of product)
        $cultivatorId = $cart->items->first()->product->user_id;

        foreach ($cart->items as $item) {
            if ($item->product->user_id !== $cultivatorId) {
                throw ValidationException::withMessages([
                    'cart' => ['Pemesanan dari beberapa pembudidaya sekaligus belum didukung. Silakan lakukan checkout terpisah.'],
                ]);
            }

            if ($item->product->stock < $item->quantity) {
                throw ValidationException::withMessages([
                    'stock' => ["Stok untuk produk '{$item->product->name}' tidak cukup."],
                ]);
            }
        }

        $isMidtrans = ($data['payment_method'] ?? 'midtrans') === 'midtrans';

        return DB::transaction(function () use ($buyer, $cultivatorId, $cart, $data, $isMidtrans) {
            $totalPrice = $cart->items->sum(fn($item) => $item->quantity * $item->price);
            $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $paymentProofPath = null;
            if (isset($data['payment_proof']) && $data['payment_proof']) {
                $paymentProofPath = $data['payment_proof']->store('payments', 'public');
            }

            $order = Order::create([
                'buyer_id' => $buyer->id,
                'cultivator_id' => $cultivatorId,
                'order_number' => $orderNumber,
                'total_price' => $totalPrice,
                'delivery_address' => $data['delivery_address'],
                'notes' => $data['notes'] ?? null,
                'payment_method' => $data['payment_method'] ?? 'midtrans',
                'payment_status' => $paymentProofPath ? 'paid' : 'pending',
                'paid_at' => $paymentProofPath ? now() : null,
                'payment_proof' => $paymentProofPath,
                'order_status' => $isMidtrans ? 'waiting_payment' : 'processing',
            ]);

            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'lettuce_type' => $item->product->lettuce_type,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'subtotal' => $item->quantity * $item->price,
                ]);

                // Reduce stock
                $item->product->decrement('stock', $item->quantity);
                if ($item->product->stock <= 0) {
                    $item->product->update(['status' => 'out_of_stock']);
                }
            }

            // Clear cart after successful checkout
            $this->cartService->clearCart($buyer);

            $order->load(['items', 'buyer', 'cultivator']);

            // If Midtrans payment method, generate Snap Token
            if ($isMidtrans && config('midtrans.server_key')) {
                try {
                    $this->midtransService->createSnapTransaction($order);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Midtrans Snap generation deferred: ' . $e->getMessage());
                }
            }

            return $order->fresh(['items', 'buyer', 'cultivator']);
        });
    }

    public function updateOrderStatus(Order $order, array $data): Order
    {
        if (isset($data['order_status']) && $data['order_status'] === 'cancelled') {
            return $this->cancelOrder($order, $data['cancellation_reason'] ?? 'Dibatalkan oleh pembudidaya');
        }

        if (isset($data['order_status']) && $data['order_status'] === 'completed') {
            $data['completed_at'] = now();
            if ($order->payment_method === 'cod') {
                $data['payment_status'] = 'paid';
                $data['paid_at'] = now();
            }
        }

        $order->update($data);
        return $order->fresh(['items', 'buyer', 'cultivator']);
    }

    public function cancelOrder(Order $order, string $reason): Order
    {
        if (in_array($order->order_status, ['completed', 'cancelled'])) {
            throw ValidationException::withMessages([
                'order_status' => ["Pesanan sudah {$order->order_status} dan tidak dapat dibatalkan."],
            ]);
        }

        return DB::transaction(function () use ($order, $reason) {
            // Restore stock
            foreach ($order->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', $item->quantity);
                    if ($item->product->status === 'out_of_stock') {
                        $item->product->update(['status' => 'active']);
                    }
                }
            }

            $order->update([
                'order_status' => 'cancelled',
                'cancellation_reason' => $reason,
                'cancelled_at' => now(),
            ]);

            return $order->fresh(['items', 'buyer', 'cultivator']);
        });
    }
}
