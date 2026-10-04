<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ulasan extends Model
{
    protected $table = 'ulasan';
    protected $primaryKey = 'id_ulasan';
    public $timestamps = false;

    protected $fillable = [
        'id_produk',
        'id_pembeli',
        'id_pesanan',
        'rating',
        'komentar',
        'tanggal_ulasan',
    ];

    protected $casts = [
        'rating'         => 'integer',
        'tanggal_ulasan' => 'datetime',
    ];

    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'id_produk', 'id_produk');
    }

    public function pembeli(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembeli', 'id_pengguna');
    }

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class, 'id_pesanan', 'id_pesanan');
    }
}
