<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pesanan extends Model
{
    protected $table = 'pesanan';
    protected $primaryKey = 'id_pesanan';
    public $timestamps = false;

    public const STATUS_MENUNGGU_PEMBAYARAN = 'MENUNGGU_PEMBAYARAN';
    public const STATUS_DIBAYAR             = 'DIBAYAR';
    public const STATUS_DIPROSES            = 'DIPROSES';
    public const STATUS_SIAP_DIAMBIL        = 'SIAP_DIAMBIL';
    public const STATUS_SELESAI             = 'SELESAI';
    public const STATUS_DIBATALKAN          = 'DIBATALKAN';

    public const METODE_QRIS = 'QRIS';
    public const METODE_COD  = 'COD';

    protected $fillable = [
        'id_pembeli',
        'tanggal_pesanan',
        'total_harga',
        'metode_pembayaran',
        'status_pesanan',
    ];

    protected $casts = [
        'tanggal_pesanan' => 'datetime',
        'total_harga'     => 'float',
    ];

    public function pembeli(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembeli', 'id_pengguna');
    }

    public function detailPesanan(): HasMany
    {
        return $this->hasMany(DetailPesanan::class, 'id_pesanan', 'id_pesanan');
    }

    public function pembayaran(): HasOne
    {
        return $this->hasOne(Pembayaran::class, 'id_pesanan', 'id_pesanan');
    }

    public function ulasan(): HasMany
    {
        return $this->hasMany(Ulasan::class, 'id_pesanan', 'id_pesanan');
    }
}
