<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CheckoutRequest;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Pesanan;
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
        $orders = Pesanan::where('id_pembeli', $request->user()->id_pengguna)
            ->with(['detailPesanan.produk', 'pembeli', 'pembayaran'])
            ->orderBy('id_pesanan', 'desc')
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
        $userId = $request->user()->id_pengguna;

        $order = Pesanan::where(function ($q) use ($userId) {
            $q->where('id_pembeli', $userId)
              ->orWhereHas('pembayaran', fn($sub) => $sub->where('id_pembudidaya', $userId))
              ->orWhereHas('detailPesanan.produk', fn($sub) => $sub->where('id_pembudidaya', $userId));
        })->with(['detailPesanan.produk', 'pembeli', 'pembayaran'])->findOrFail($id);

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
        $order = Pesanan::where('id_pembeli', $request->user()->id_pengguna)->findOrFail($id);

        $reason = $request->input('cancellation_reason', 'Dibatalkan oleh pembeli');
        $cancelledOrder = $this->orderService->cancelOrder($order, $reason);

        return $this->successResponse(
            new OrderResource($cancelledOrder),
            'Pesanan berhasil dibatalkan.'
        );
    }

    /**
     * Cultivator order list
     */
    public function cultivatorOrders(Request $request): JsonResponse
    {
        $userId = $request->user()->id_pengguna;

        $orders = Pesanan::whereHas('detailPesanan.produk', fn($q) => $q->where('id_pembudidaya', $userId))
            ->when($request->get('status'), fn($q, $s) => $q->where('status_pesanan', $s))
            ->with(['detailPesanan.produk', 'pembeli', 'pembayaran'])
            ->orderBy('id_pesanan', 'desc')
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
        $userId = $request->user()->id_pengguna;

        $order = Pesanan::whereHas('detailPesanan.produk', fn($q) => $q->where('id_pembudidaya', $userId))->findOrFail($id);

        $updatedOrder = $this->orderService->updateOrderStatus($order, $request->validated());

        return $this->successResponse(
            new OrderResource($updatedOrder),
            'Status pesanan berhasil diperbarui.'
        );
    }
}
