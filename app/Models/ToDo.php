<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToDo extends Model
{
    protected $table = 'to_do';
    protected $primaryKey = 'id_todo';
    public $timestamps = false;

    protected $fillable = [
        'id_pembudidaya',
        'id_pengelolaan',
        'nama_tugas',
        'tanggal_tugas',
        'status',
        'created_at',
    ];

    protected $casts = [
        'tanggal_tugas' => 'date',
        'status'        => 'boolean',
        'created_at'    => 'datetime',
    ];

    public function pembudidaya(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function pengelolaan(): BelongsTo
    {
        return $this->belongsTo(Pengelolaan::class, 'id_pengelolaan', 'id_pengelolaan');
    }
}
