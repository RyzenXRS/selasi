<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CheckoutRequest;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * Buyer order list
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::where('buyer_id', $request->user()->id)
            ->with(['items', 'cultivator'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            OrderResource::collection($orders),
            'Daftar pesanan pembeli berhasil diambil.'
        );
    }

    /**
     * Buyer checkout
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $order = $this->orderService->checkout($request->user(), $request->validated());

        return $this->createdResponse(
            new OrderResource($order),
            'Pesanan berhasil dibuat.'
        );
    }

    /**
     * Buyer or Cultivator show order details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $order = Order::where(function ($q) use ($userId) {
            $q->where('buyer_id', $userId)->orWhere('cultivator_id', $userId);
        })->with(['items', 'buyer', 'cultivator'])->findOrFail($id);

        return $this->successResponse(
            new OrderResource($order),
            'Detail pesanan berhasil diambil.'
        );
    }

    /**
     * Buyer cancel order
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $order = Order::where('buyer_id', $request->user()->id)->findOrFail($id);

        $reason = $request->input('cancellation_reason', 'Dibatalkan oleh pembeli');
        $cancelledOrder = $this->orderService->cancelOrder($order, $reason);

        return $this->successResponse(
            new OrderResource($cancelledOrder),
            'Pesanan berhasil dibatalkan.'
        );
    }

    /**
     * Buyer pay order (upload payment proof)
     */
    public function pay(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'payment_proof' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $order = Order::where('buyer_id', $request->user()->id)->findOrFail($id);

        $proofPath = $request->file('payment_proof')->store('payments', 'public');

        $order->update([
            'payment_proof' => $proofPath,
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        return $this->successResponse(
            new OrderResource($order->fresh(['items', 'buyer', 'cultivator'])),
            'Bukti pembayaran berhasil diunggah.'
        );
    }

    /**
     * Cultivator order list
     */
    public function cultivatorOrders(Request $request): JsonResponse
    {
        $orders = Order::where('cultivator_id', $request->user()->id)
            ->when($request->get('status'), fn($q, $s) => $q->where('order_status', $s))
            ->with(['items', 'buyer'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            OrderResource::collection($orders),
            'Daftar pesanan masuk pembudidaya berhasil diambil.'
        );
    }

    /**
     * Cultivator update order status
     */
    public function updateStatus(UpdateOrderStatusRequest $request, int $id): JsonResponse
    {
        $order = Order::where('cultivator_id', $request->user()->id)->findOrFail($id);

        $updatedOrder = $this->orderService->updateOrderStatus($order, $request->validated());

        return $this->successResponse(
            new OrderResource($updatedOrder),
            'Status pesanan berhasil diperbarui.'
        );
    }
}
