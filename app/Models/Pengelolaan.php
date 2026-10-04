<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pengelolaan extends Model
{
    protected $table = 'pengelolaan';
    protected $primaryKey = 'id_pengelolaan';
    public $timestamps = false;

    public const STATUS_AKTIF   = 'AKTIF';
    public const STATUS_SELESAI = 'SELESAI';
    public const STATUS_GAGAL   = 'GAGAL';

    protected $fillable = [
        'id_pembudidaya',
        'kode_pengelolaan',
        'tanggal_tanam',
        'jumlah_tanaman',
        'lokasi',
        'kondisi_tanaman',
        'kondisi_air_nutrisi',
        'kondisi_instalasi',
        'kondisi_lingkungan',
        'nilai_ph',
        'catatan',
        'status',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'tanggal_tanam' => 'date',
        'jumlah_tanaman' => 'integer',
        'nilai_ph' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ==================== Relasi ====================

    public function pembudidaya(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function perpindahanFase(): HasMany
    {
        return $this->hasMany(PerpindahanFase::class, 'id_pengelolaan', 'id_pengelolaan');
    }

    public function panen(): HasMany
    {
        return $this->hasMany(Panen::class, 'id_pengelolaan', 'id_pengelolaan');
    }

    public function todoList(): HasMany
    {
        return $this->hasMany(ToDo::class, 'id_pengelolaan', 'id_pengelolaan');
    }

    public function notifikasi(): HasMany
    {
        return $this->hasMany(Notifikasi::class, 'id_pengelolaan', 'id_pengelolaan');
    }

    public function prediksiPanen(): HasMany
    {
        return $this->hasMany(PrediksiPanen::class, 'id_pengelolaan', 'id_pengelolaan');
    }
}
