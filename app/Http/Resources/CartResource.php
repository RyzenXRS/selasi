<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->whenLoaded('items', fn() => CartItemResource::collection($this->items), []);

        $total = $this->whenLoaded('items', function () {
            return $this->items->sum(fn($item) => $item->jumlah * ($item->harga_satuan ?? $item->produk?->harga ?? 0));
        }, 0);

        return [
            'id_keranjang' => $this->id_keranjang,
            'id'           => $this->id_keranjang,
            'id_pembeli'   => $this->id_pembeli,
            'user_id'      => $this->id_pembeli,
            'items'        => $items,
            'total_items'  => $this->whenLoaded('items', fn() => $this->items->sum('jumlah'), 0),
            'total_price'  => round((float) $total, 2),
            'total_harga'  => round((float) $total, 2),
            'created_at'   => $this->created_at?->toIso8601String(),
        ];
    }
}
