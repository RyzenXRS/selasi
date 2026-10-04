<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Keranjang extends Model
{
    protected $table = 'keranjang';
    protected $primaryKey = 'id_keranjang';
    public $timestamps = false;

    protected $fillable = [
        'id_pembeli',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function pembeli(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembeli', 'id_pengguna');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ItemKeranjang::class, 'id_keranjang', 'id_keranjang');
    }
}
