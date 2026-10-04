<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerpindahanFase extends Model
{
    protected $table = 'perpindahan_fase';
    protected $primaryKey = 'id_perpindahan';
    public $timestamps = false;

    protected $fillable = [
        'id_pengelolaan',
        'id_fase',
        'tanggal_mulai',
        'tanggal_selesai',
        'catatan',
    ];

    protected $casts = [
        'tanggal_mulai'   => 'date',
        'tanggal_selesai' => 'date',
    ];

    public function pengelolaan(): BelongsTo
    {
        return $this->belongsTo(Pengelolaan::class, 'id_pengelolaan', 'id_pengelolaan');
    }

    public function fase(): BelongsTo
    {
        return $this->belongsTo(FaseBudidaya::class, 'id_fase', 'id_fase');
    }
}
