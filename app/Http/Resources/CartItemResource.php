<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $harga = (float) ($this->harga_satuan ?? $this->produk?->harga ?? 0);
        $qty   = (int) $this->jumlah;

        return [
            'id_item_keranjang' => $this->id_item_keranjang,
            'id'                => $this->id_item_keranjang,
            'id_keranjang'      => $this->id_keranjang,
            'cart_id'           => $this->id_keranjang,
            'id_produk'         => $this->id_produk,
            'product_id'        => $this->id_produk,
            'produk'            => new ProductResource($this->whenLoaded('produk')),
            'product'           => new ProductResource($this->whenLoaded('produk')),
            'jumlah'            => $qty,
            'quantity'          => $qty,
            'harga_satuan'      => $harga,
            'price'             => $harga,
            'subtotal'          => round($qty * $harga, 2),
            'created_at'        => $this->created_at?->toIso8601String(),
        ];
    }
}
