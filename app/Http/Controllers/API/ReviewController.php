<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Pesanan;
use App\Models\Produk;
use App\Models\Ulasan;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(int $productId): JsonResponse
    {
        $product = Produk::findOrFail($productId);

        $reviews = $product->ulasan()
            ->with('pembeli')
            ->orderBy('id_ulasan', 'desc')
            ->get();

        return $this->successResponse(
            ReviewResource::collection($reviews),
            'Daftar ulasan produk berhasil diambil.'
        );
    }

    public function store(StoreReviewRequest $request, int $productId): JsonResponse
    {
        $buyer = $request->user();
        $product = Produk::findOrFail($productId);
        $orderId = $request->id_pesanan ?? $request->order_id;

        // Verify that order exists, belongs to buyer, contains product, and is completed
        $order = Pesanan::where('id_pesanan', $orderId)
            ->where('id_pembeli', $buyer->id_pengguna)
            ->where('status_pesanan', Pesanan::STATUS_SELESAI)
            ->whereHas('detailPesanan', fn($q) => $q->where('id_produk', $productId))
            ->firstOrFail();

        $review = Ulasan::updateOrCreate(
            [
                'id_pembeli' => $buyer->id_pengguna,
                'id_produk'  => $product->id_produk,
                'id_pesanan' => $order->id_pesanan,
            ],
            [
                'rating'         => $request->rating,
                'komentar'       => $request->komentar ?? $request->comment,
                'tanggal_ulasan' => Carbon::now(),
            ]
        );

        return $this->createdResponse(
            new ReviewResource($review->load('pembeli')),
            'Ulasan produk berhasil dikirim.'
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'rating'   => ['sometimes', 'integer', 'min:1', 'max:5'],
            'komentar' => ['nullable', 'string'],
            'comment'  => ['nullable', 'string'],
        ]);

        $review = Ulasan::where('id_pembeli', $request->user()->id_pengguna)->findOrFail($id);

        $payload = [];
        if ($request->has('rating')) {
            $payload['rating'] = $request->rating;
        }
        if ($request->has('komentar') || $request->has('comment')) {
            $payload['komentar'] = $request->komentar ?? $request->comment;
        }
        $payload['tanggal_ulasan'] = Carbon::now();

        $review->update($payload);

        return $this->successResponse(
            new ReviewResource($review->fresh('pembeli')),
            'Ulasan produk berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $review = Ulasan::where('id_pembeli', $request->user()->id_pengguna)->findOrFail($id);
        $review->delete();

        return $this->noContentResponse('Ulasan produk berhasil dihapus.');
    }
}
