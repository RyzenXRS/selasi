<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Panen extends Model
{
    protected $table = 'panen';
    protected $primaryKey = 'id_panen';
    public $timestamps = false;

    protected $fillable = [
        'id_pengelolaan',
        'tanggal_panen',
        'jumlah_panen',
        'berat_panen',
        'kualitas',
        'created_at',
    ];

    protected $casts = [
        'tanggal_panen' => 'date',
        'jumlah_panen'  => 'integer',
        'berat_panen'   => 'float',
        'created_at'    => 'datetime',
    ];

    public function pengelolaan(): BelongsTo
    {
        return $this->belongsTo(Pengelolaan::class, 'id_pengelolaan', 'id_pengelolaan');
    }
}
