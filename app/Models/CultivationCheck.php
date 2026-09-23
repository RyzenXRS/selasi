<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CultivationCheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'check_date',
        'plant_condition',
        'water_ph',
        'tds_ppm',
        'temperature',
        'installation_condition',
        'notes',
    ];

    protected $casts = [
        'check_date' => 'date',
        'water_ph' => 'float',
        'tds_ppm' => 'integer',
        'temperature' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CultivationBatch::class, 'batch_id');
    }
}
