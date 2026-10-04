<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $pembayaran = $this->whenLoaded('pembayaran');

        return [
            'id_pesanan'        => $this->id_pesanan,
            'id'                => $this->id_pesanan,
            'id_pembeli'        => $this->id_pembeli,
            'buyer_id'          => $this->id_pembeli,
            'pembeli'           => new UserResource($this->whenLoaded('pembeli')),
            'buyer'             => new UserResource($this->whenLoaded('pembeli')),
            'tanggal_pesanan'   => $this->tanggal_pesanan?->toIso8601String(),
            'total_harga'       => (float) $this->total_harga,
            'total_price'       => (float) $this->total_harga,
            'metode_pembayaran' => $this->metode_pembayaran,
            'payment_method'    => $this->metode_pembayaran,
            'status_pesanan'    => $this->status_pesanan,
            'order_status'      => $this->status_pesanan,
            'pembayaran'        => $pembayaran ? [
                'id_pembayaran'     => $pembayaran->id_pembayaran,
                'status_pembayaran' => $pembayaran->status_pembayaran,
                'order_id_gateway'  => $pembayaran->order_id_gateway,
                'snap_token'        => $pembayaran->snap_token,
                'redirect_url'      => $pembayaran->redirect_url,
                'waktu_pembayaran'  => $pembayaran->waktu_pembayaran?->toIso8601String(),
            ] : null,
            'payment'           => $pembayaran ? [
                'status'            => $pembayaran->status_pembayaran,
                'snap_token'        => $pembayaran->snap_token,
                'redirect_url'      => $pembayaran->redirect_url,
                'paid_at'           => $pembayaran->waktu_pembayaran?->toIso8601String(),
            ] : null,
            'detail_pesanan'    => OrderItemResource::collection($this->whenLoaded('detailPesanan')),
            'items'             => OrderItemResource::collection($this->whenLoaded('detailPesanan')),
        ];
    }
}
