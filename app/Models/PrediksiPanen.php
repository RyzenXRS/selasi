<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrediksiPanen extends Model
{
    protected $table = 'prediksi_panen';
    protected $primaryKey = 'id_prediksi_panen';
    public $timestamps = false;

    public const STATUS_BELUM_SIAP    = 'BELUM_SIAP';
    public const STATUS_MENDEKATI_SIAP = 'MENDEKATI_SIAP';
    public const STATUS_SIAP          = 'SIAP';

    protected $fillable = [
        'id_pengelolaan',
        'status_kesiapan',
        'perkiraan_tanggal_mulai',
        'perkiraan_tanggal_selesai',
        'nilai_prediksi',
        'created_at',
    ];

    protected $casts = [
        'perkiraan_tanggal_mulai'   => 'date',
        'perkiraan_tanggal_selesai' => 'date',
        'nilai_prediksi'            => 'float',
        'created_at'                => 'datetime',
    ];

    public function pengelolaan(): BelongsTo
    {
        return $this->belongsTo(Pengelolaan::class, 'id_pengelolaan', 'id_pengelolaan');
    }
}
