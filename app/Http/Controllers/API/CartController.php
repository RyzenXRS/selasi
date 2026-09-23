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
        $cart->load(['items.product.cultivator']);

        return $this->successResponse(
            new CartResource($cart),
            'Keranjang belanja berhasil diambil.'
        );
    }

    public function addItem(AddToCartRequest $request): JsonResponse
    {
        $item = $this->cartService->addItem(
            $request->user(),
            $request->product_id,
            $request->quantity
        );

        return $this->createdResponse(
            new CartItemResource($item),
            'Item berhasil ditambahkan ke keranjang.'
        );
    }

    public function updateItem(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        $item = $this->cartService->updateItem(
            $request->user(),
            $itemId,
            $request->quantity
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
