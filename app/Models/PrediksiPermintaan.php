<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrediksiPermintaan extends Model
{
    protected $table = 'prediksi_permintaan';
    protected $primaryKey = 'id_prediksi_permintaan';
    public $timestamps = false;

    protected $fillable = [
        'id_pembudidaya',
        'periode_mulai',
        'periode_selesai',
        'tanggal_prediksi',
        'hasil_prediksi',
        'satuan',
        'created_at',
    ];

    protected $casts = [
        'periode_mulai'    => 'date',
        'periode_selesai'  => 'date',
        'tanggal_prediksi' => 'date',
        'hasil_prediksi'   => 'float',
        'created_at'       => 'datetime',
    ];

    public function pembudidaya(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembudidaya', 'id_pengguna');
    }
}
