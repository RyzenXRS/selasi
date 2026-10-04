<?php

namespace App\Services;

use App\Models\ItemKeranjang;
use App\Models\Keranjang;
use App\Models\Pengguna;
use App\Models\Produk;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function getOrCreateCart(Pengguna $pembeli): Keranjang
    {
        return Keranjang::firstOrCreate(
            ['id_pembeli' => $pembeli->id_pengguna],
            [
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]
        );
    }

    public function addItem(Pengguna $pembeli, int $productId, int $quantity): ItemKeranjang
    {
        $cart = $this->getOrCreateCart($pembeli);
        $product = Produk::with('stok')->findOrFail($productId);
        $stock = $product->stok?->jumlah_stok ?? 0;

        if ($stock < $quantity) {
            throw ValidationException::withMessages([
                'stock' => ["Stok produk '{$product->nama_produk}' tidak mencukupi (Tersedia: {$stock})."],
            ]);
        }

        $item = $cart->items()->where('id_produk', $productId)->first();

        if ($item) {
            $newQuantity = $item->jumlah + $quantity;
            if ($stock < $newQuantity) {
                throw ValidationException::withMessages([
                    'stock' => ["Stok produk '{$product->nama_produk}' tidak mencukupi untuk penambahan ini."],
                ]);
            }
            $item->update([
                'jumlah'       => $newQuantity,
                'harga_satuan' => $product->harga,
                'updated_at'   => Carbon::now(),
            ]);
        } else {
            $item = $cart->items()->create([
                'id_produk'    => $productId,
                'jumlah'       => $quantity,
                'harga_satuan' => $product->harga,
                'created_at'   => Carbon::now(),
                'updated_at'   => Carbon::now(),
            ]);
        }

        return $item->fresh('produk.stok');
    }

    public function updateItem(Pengguna $pembeli, int $itemId, int $quantity): ItemKeranjang
    {
        $cart = $this->getOrCreateCart($pembeli);
        $item = $cart->items()->with('produk.stok')->findOrFail($itemId);
        $stock = $item->produk?->stok?->jumlah_stok ?? 0;

        if ($stock < $quantity) {
            throw ValidationException::withMessages([
                'stock' => ["Stok produk '{$item->produk->nama_produk}' tidak mencukupi (Tersedia: {$stock})."],
            ]);
        }

        $item->update([
            'jumlah'     => $quantity,
            'updated_at' => Carbon::now(),
        ]);

        return $item->fresh('produk.stok');
    }

    public function removeItem(Pengguna $pembeli, int $itemId): void
    {
        $cart = $this->getOrCreateCart($pembeli);
        $cart->items()->where('id_item_keranjang', $itemId)->delete();
    }

    public function clearCart(Pengguna $pembeli): void
    {
        $cart = $this->getOrCreateCart($pembeli);
        $cart->items()->delete();
    }
}
