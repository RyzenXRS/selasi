<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cultivator_id' => $this->user_id,
            'cultivator_name' => $this->whenLoaded('cultivator', fn() => $this->cultivator->name),
            'name' => $this->name,
            'lettuce_type' => $this->lettuce_type,
            'description' => $this->description,
            'price' => $this->price,
            'price_unit' => $this->price_unit,
            'image' => $this->image ? asset('storage/' . $this->image) : null,
            'stock' => $this->stock,
            'status' => $this->status,
            'rating_avg' => round($this->whenLoaded('reviews', fn() => $this->reviews->avg('rating'), 0), 1),
            'reviews_count' => $this->whenCounted('reviews'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
