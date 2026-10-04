<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_detail'    => $this->id_detail,
            'id'           => $this->id_detail,
            'id_pesanan'   => $this->id_pesanan,
            'order_id'     => $this->id_pesanan,
            'id_produk'    => $this->id_produk,
            'product_id'   => $this->id_produk,
            'nama_produk'  => $this->produk?->nama_produk,
            'product_name' => $this->produk?->nama_produk,
            'jumlah'       => (int) $this->jumlah,
            'quantity'     => (int) $this->jumlah,
            'harga_satuan' => (float) $this->harga_satuan,
            'price'        => (float) $this->harga_satuan,
            'subtotal'     => (float) $this->subtotal,
        ];
    }
}
