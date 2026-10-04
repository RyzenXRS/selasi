<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FaseBudidaya extends Model
{
    protected $table = 'fase_budidaya';
    protected $primaryKey = 'id_fase';
    public $timestamps = false;

    protected $fillable = [
        'nama_fase',
        'urutan_fase',
    ];

    protected $casts = [
        'urutan_fase' => 'integer',
    ];
}
