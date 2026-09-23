<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function getOrCreateCart(User $buyer): Cart
    {
        return Cart::firstOrCreate(['user_id' => $buyer->id]);
    }

    public function addItem(User $buyer, int $productId, int $quantity): CartItem
    {
        $cart = $this->getOrCreateCart($buyer);
        $product = Product::findOrFail($productId);

        if ($product->stock < $quantity) {
            throw ValidationException::withMessages([
                'stock' => ["Stok produk '{$product->name}' tidak mencukupi (Tersedia: {$product->stock})."],
            ]);
        }

        $item = $cart->items()->where('product_id', $productId)->first();

        if ($item) {
            $newQuantity = $item->quantity + $quantity;
            if ($product->stock < $newQuantity) {
                throw ValidationException::withMessages([
                    'stock' => ["Stok produk '{$product->name}' tidak mencukupi untuk penambahan ini."],
                ]);
            }
            $item->update([
                'quantity' => $newQuantity,
                'price' => $product->price,
            ]);
        } else {
            $item = $cart->items()->create([
                'product_id' => $productId,
                'quantity' => $quantity,
                'price' => $product->price,
            ]);
        }

        return $item->fresh('product');
    }

    public function updateItem(User $buyer, int $itemId, int $quantity): CartItem
    {
        $cart = $this->getOrCreateCart($buyer);
        $item = $cart->items()->with('product')->findOrFail($itemId);

        if ($item->product->stock < $quantity) {
            throw ValidationException::withMessages([
                'stock' => ["Stok produk '{$item->product->name}' tidak mencukupi (Tersedia: {$item->product->stock})."],
            ]);
        }

        $item->update(['quantity' => $quantity]);
        return $item->fresh('product');
    }

    public function removeItem(User $buyer, int $itemId): void
    {
        $cart = $this->getOrCreateCart($buyer);
        $cart->items()->where('id', $itemId)->delete();
    }

    public function clearCart(User $buyer): void
    {
        $cart = $this->getOrCreateCart($buyer);
        $cart->items()->delete();
    }
}
