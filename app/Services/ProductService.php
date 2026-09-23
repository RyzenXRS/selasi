<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class ProductService
{
    public function createProduct(User $cultivator, array $data): Product
    {
        if (isset($data['image']) && $data['image']) {
            $data['image'] = $data['image']->store('products', 'public');
        }

        return $cultivator->products()->create([
            'name' => $data['name'],
            'lettuce_type' => $data['lettuce_type'],
            'description' => $data['description'] ?? null,
            'price' => $data['price'],
            'price_unit' => $data['price_unit'] ?? 'ikat',
            'image' => $data['image'] ?? null,
            'stock' => $data['stock'],
            'status' => $data['status'] ?? ($data['stock'] > 0 ? 'active' : 'out_of_stock'),
        ]);
    }

    public function updateProduct(Product $product, array $data): Product
    {
        if (isset($data['image']) && $data['image']) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $data['image']->store('products', 'public');
        }

        if (isset($data['stock'])) {
            if ($data['stock'] <= 0) {
                $data['status'] = 'out_of_stock';
            } elseif ($product->status === 'out_of_stock' && $data['stock'] > 0) {
                $data['status'] = 'active';
            }
        }

        $product->update($data);
        return $product->fresh();
    }

    public function deleteProduct(Product $product): void
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();
    }
}
