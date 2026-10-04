<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\AddToCartRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartItemResource;
use App\Http\Resources\CartResource;
use App\Services\CartService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CartService $cartService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $cart = $this->cartService->getOrCreateCart($request->user());
        $cart->load(['items.produk.pembudidaya', 'items.produk.stok']);

        return $this->successResponse(
            new CartResource($cart),
            'Keranjang belanja berhasil diambil.'
        );
    }

    public function addItem(AddToCartRequest $request): JsonResponse
    {
        $productId = $request->id_produk ?? $request->product_id;
        $quantity  = $request->jumlah ?? $request->quantity;

        $item = $this->cartService->addItem(
            $request->user(),
            (int) $productId,
            (int) $quantity
        );

        return $this->createdResponse(
            new CartItemResource($item),
            'Item berhasil ditambahkan ke keranjang.'
        );
    }

    public function updateItem(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        $quantity = $request->jumlah ?? $request->quantity;

        $item = $this->cartService->updateItem(
            $request->user(),
            $itemId,
            (int) $quantity
        );

        return $this->successResponse(
            new CartItemResource($item),
            'Jumlah item keranjang berhasil diperbarui.'
        );
    }

    public function removeItem(Request $request, int $itemId): JsonResponse
    {
        $this->cartService->removeItem($request->user(), $itemId);

        return $this->noContentResponse('Item berhasil dihapus dari keranjang.');
    }

    public function clear(Request $request): JsonResponse
    {
        $this->cartService->clearCart($request->user());

        return $this->noContentResponse('Keranjang belanja berhasil dikosongkan.');
    }
}
