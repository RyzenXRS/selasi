<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Produk extends Model
{
    protected $table = 'produk';
    protected $primaryKey = 'id_produk';
    public $timestamps = false;

    protected $fillable = [
        'id_pembudidaya',
        'nama_produk',
        'deskripsi',
        'harga',
        'foto_produk',
        'status_produk',
    ];

    protected $casts = [
        'harga'        => 'float',
        'status_produk' => 'boolean',
    ];

    public function pembudidaya(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function stok(): HasOne
    {
        return $this->hasOne(Stok::class, 'id_produk', 'id_produk');
    }

    public function itemKeranjang(): HasMany
    {
        return $this->hasMany(ItemKeranjang::class, 'id_produk', 'id_produk');
    }

    public function detailPesanan(): HasMany
    {
        return $this->hasMany(DetailPesanan::class, 'id_produk', 'id_produk');
    }

    public function ulasan(): HasMany
    {
        return $this->hasMany(Ulasan::class, 'id_produk', 'id_produk');
    }
}
