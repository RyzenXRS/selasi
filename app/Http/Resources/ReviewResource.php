<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_ulasan'      => $this->id_ulasan,
            'id'             => $this->id_ulasan,
            'id_pembeli'     => $this->id_pembeli,
            'pembeli'        => new UserResource($this->whenLoaded('pembeli')),
            'buyer'          => new UserResource($this->whenLoaded('pembeli')),
            'id_produk'      => $this->id_produk,
            'product_id'     => $this->id_produk,
            'id_pesanan'     => $this->id_pesanan,
            'order_id'       => $this->id_pesanan,
            'rating'         => (int) $this->rating,
            'komentar'       => $this->komentar,
            'comment'        => $this->komentar,
            'tanggal_ulasan' => $this->tanggal_ulasan?->toIso8601String(),
            'created_at'     => $this->tanggal_ulasan?->toIso8601String(),
        ];
    }
}
