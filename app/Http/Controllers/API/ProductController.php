<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $products = Product::with(['cultivator', 'reviews'])
            ->when($request->get('search'), fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->get('type'), fn($q, $type) => $q->where('lettuce_type', $type))
            ->when($request->get('cultivator_id'), fn($q, $cid) => $q->where('user_id', $cid))
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            ProductResource::collection($products),
            'Katalog produk selada berhasil diambil.'
        );
    }

    public function show(int $id): JsonResponse
    {
        $product = Product::with(['cultivator', 'reviews.buyer'])
            ->withCount('reviews')
            ->findOrFail($id);

        return $this->successResponse(
            new ProductResource($product),
            'Detail produk selada berhasil diambil.'
        );
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = $this->productService->createProduct(
            $request->user(),
            $request->validated()
        );

        return $this->createdResponse(
            new ProductResource($product),
            'Produk selada berhasil ditambahkan.'
        );
    }

    public function update(ProductRequest $request, int $id): JsonResponse
    {
        $product = Product::where('user_id', $request->user()->id)->findOrFail($id);

        $updatedProduct = $this->productService->updateProduct(
            $product,
            $request->validated()
        );

        return $this->successResponse(
            new ProductResource($updatedProduct),
            'Produk selada berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $product = Product::where('user_id', $request->user()->id)->findOrFail($id);

        $this->productService->deleteProduct($product);

        return $this->noContentResponse('Produk selada berhasil dihapus.');
    }
}
