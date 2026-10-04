<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemKeranjang extends Model
{
    protected $table = 'item_keranjang';
    protected $primaryKey = 'id_item_keranjang';
    public $timestamps = false;

    protected $fillable = [
        'id_keranjang',
        'id_produk',
        'jumlah',
        'harga_satuan',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'jumlah'       => 'integer',
        'harga_satuan' => 'float',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    public function keranjang(): BelongsTo
    {
        return $this->belongsTo(Keranjang::class, 'id_keranjang', 'id_keranjang');
    }

    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'id_produk', 'id_produk');
    }
}
