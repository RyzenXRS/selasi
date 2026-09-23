<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);

        $reviews = $product->reviews()
            ->with('buyer')
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(
            ReviewResource::collection($reviews),
            'Daftar ulasan produk berhasil diambil.'
        );
    }

    public function store(StoreReviewRequest $request, int $productId): JsonResponse
    {
        $buyer = $request->user();
        $product = Product::findOrFail($productId);

        // Verify that order exists, belongs to buyer, contains product, and is completed
        $order = Order::where('id', $request->order_id)
            ->where('buyer_id', $buyer->id)
            ->where('order_status', 'completed')
            ->whereHas('items', fn($q) => $q->where('product_id', $productId))
            ->firstOrFail();

        $review = Review::create([
            'buyer_id' => $buyer->id,
            'product_id' => $product->id,
            'order_id' => $order->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        return $this->createdResponse(
            new ReviewResource($review->load('buyer')),
            'Ulasan produk berhasil dikirim.'
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        $review = Review::where('buyer_id', $request->user()->id)->findOrFail($id);

        $review->update($request->only(['rating', 'comment']));

        return $this->successResponse(
            new ReviewResource($review->fresh('buyer')),
            'Ulasan produk berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $review = Review::where('buyer_id', $request->user()->id)->findOrFail($id);
        $review->delete();

        return $this->noContentResponse('Ulasan produk berhasil dihapus.');
    }
}
