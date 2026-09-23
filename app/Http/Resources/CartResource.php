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
            return $this->items->sum(fn($item) => $item->quantity * $item->price);
        }, 0);

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'items' => $items,
            'total_items' => $this->whenLoaded('items', fn() => $this->items->sum('quantity'), 0),
            'total_price' => round($total, 2),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
