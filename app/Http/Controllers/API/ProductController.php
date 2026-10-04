<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Produk;
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
        $products = Produk::with(['pembudidaya', 'stok', 'ulasan'])
            ->withCount('ulasan')
            ->when($request->get('search'), function ($q, $s) {
                $q->where('nama_produk', 'like', "%{$s}%")
                  ->orWhere('deskripsi', 'like', "%{$s}%");
            })
            ->when($request->get('cultivator_id') || $request->get('id_pembudidaya'), function ($q) use ($request) {
                $q->where('id_pembudidaya', $request->get('id_pembudidaya', $request->get('cultivator_id')));
            })
            ->where('status_produk', true)
            ->orderBy('id_produk', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            ProductResource::collection($products),
            'Katalog produk selada berhasil diambil.'
        );
    }

    public function show(int $id): JsonResponse
    {
        $product = Produk::with(['pembudidaya', 'stok', 'ulasan.pembeli'])
            ->withCount('ulasan')
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
        $product = Produk::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);

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
        $product = Produk::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);

        $this->productService->deleteProduct($product);

        return $this->noContentResponse('Produk selada berhasil dihapus.');
    }
}
