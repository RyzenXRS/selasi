<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $pembayaran = $this->whenLoaded('pembayaran');
        $itemPertama = $this->relationLoaded('detailPesanan') ? $this->detailPesanan->first() : null;

        return [
            'id_pesanan'        => $this->id_pesanan,
            'id'                => $this->id_pesanan,
            'nomor_pesanan'     => 'ORD-' . ($this->tanggal_pesanan ? $this->tanggal_pesanan->format('Ymd') : date('Ymd')) . '-' . str_pad($this->id_pesanan, 3, '0', STR_PAD_LEFT),
            'id_pembeli'        => $this->id_pembeli,
            'buyer_id'          => $this->id_pembeli,
            'nama_pembeli'      => $this->relationLoaded('pembeli') ? ($this->pembeli?->nama ?? '-') : '-',
            'pembeli'           => new UserResource($this->whenLoaded('pembeli')),
            'buyer'             => new UserResource($this->whenLoaded('pembeli')),
            'tanggal_pesanan'   => $this->tanggal_pesanan?->toIso8601String(),
            'total_harga'       => (float) $this->total_harga,
            'total_price'       => (float) $this->total_harga,
            'total_pembayaran'  => (float) $this->total_harga,
            'metode_pembayaran' => $this->metode_pembayaran,
            'payment_method'    => $this->metode_pembayaran,
            'status_pesanan'    => $this->status_pesanan,
            'order_status'      => $this->status_pesanan,
            'status_pembayaran' => $pembayaran ? $pembayaran->status_pembayaran : 'Belum Dibayar',
            'nama_produk'       => $itemPertama?->produk?->nama_produk ?? 'Selada Hijau Segar',
            'jumlah_produk'     => $itemPertama ? (float) $itemPertama->jumlah : 1,
            'harga_produk'      => $itemPertama ? (float) $itemPertama->harga_satuan : 15000,
            'foto_produk'       => $itemPertama?->produk?->foto_produk ? asset('storage/' . $itemPertama->produk->foto_produk) : null,
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
