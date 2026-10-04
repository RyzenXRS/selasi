<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';
    protected $primaryKey = 'id_pembayaran';
    public $timestamps = false;

    public const STATUS_MENUNGGU   = 'MENUNGGU';
    public const STATUS_LUNAS      = 'LUNAS';
    public const STATUS_GAGAL      = 'GAGAL';
    public const STATUS_KADALUARSA = 'KADALUARSA';
    public const STATUS_DIBATALKAN = 'DIBATALKAN';

    protected $fillable = [
        'id_pesanan',
        'id_pembudidaya',
        'metode_pembayaran',
        'status_pembayaran',
        'jumlah_bayar',
        'order_id_gateway',
        'id_transaksi_gateway',
        'qr_string',
        'redirect_url',
        'snap_token',
        'waktu_kadaluarsa',
        'waktu_pembayaran',
        'respons_gateway',
    ];

    protected $casts = [
        'jumlah_bayar'     => 'float',
        'waktu_kadaluarsa' => 'datetime',
        'waktu_pembayaran' => 'datetime',
        'respons_gateway'  => 'array',
    ];

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class, 'id_pesanan', 'id_pesanan');
    }

    public function pembudidaya(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembudidaya', 'id_pengguna');
    }
}
