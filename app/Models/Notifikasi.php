<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notifikasi extends Model
{
    protected $table = 'notifikasi';
    protected $primaryKey = 'id_notifikasi';
    public $timestamps = false;

    public const JENIS_PENGINGAT_FASE   = 'PENGINGAT_FASE';
    public const JENIS_PREDIKSI_PANEN   = 'PREDIKSI_PANEN';
    public const JENIS_BATAS_UMUR_PANEN = 'BATAS_UMUR_PANEN';

    protected $fillable = [
        'id_pengguna',
        'id_pengelolaan',
        'jenis_notifikasi',
        'isi_notifikasi',
        'status_dibaca',
        'waktu_notifikasi',
    ];

    protected $casts = [
        'status_dibaca'    => 'boolean',
        'waktu_notifikasi' => 'datetime',
    ];

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pengguna', 'id_pengguna');
    }

    public function pengelolaan(): BelongsTo
    {
        return $this->belongsTo(Pengelolaan::class, 'id_pengelolaan', 'id_pengelolaan');
    }
}
