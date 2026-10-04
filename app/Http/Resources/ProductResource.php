<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stokVal = $this->relationLoaded('stok') ? ($this->stok?->jumlah_stok ?? 0) : ($this->stok?->jumlah_stok ?? 0);

        return [
            'id_produk'       => $this->id_produk,
            'id'              => $this->id_produk,
            'id_pembudidaya'  => $this->id_pembudidaya,
            'cultivator_id'   => $this->id_pembudidaya,
            'nama_pembudidaya'=> $this->whenLoaded('pembudidaya', fn() => $this->pembudidaya?->nama),
            'cultivator_name' => $this->whenLoaded('pembudidaya', fn() => $this->pembudidaya?->nama),
            'nama_produk'     => $this->nama_produk,
            'name'            => $this->nama_produk,
            'deskripsi'       => $this->deskripsi,
            'description'     => $this->deskripsi,
            'harga'           => (float) $this->harga,
            'price'           => (float) $this->harga,
            'foto_produk'     => $this->foto_produk ? asset('storage/' . $this->foto_produk) : null,
            'image'           => $this->foto_produk ? asset('storage/' . $this->foto_produk) : null,
            'status_produk'   => (bool) $this->status_produk,
            'status'          => $this->status_produk ? 'active' : 'inactive',
            'jumlah_stok'     => (float) $stokVal,
            'stock'           => (float) $stokVal,
            'rating_avg'      => $this->whenLoaded('ulasan', fn() => round((float) ($this->ulasan->avg('rating') ?: 0), 1)),
            'reviews_count'   => $this->whenCounted('ulasan'),
        ];
    }
}
