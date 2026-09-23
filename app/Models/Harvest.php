<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Harvest extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'harvest_date',
        'quantity',
        'weight',
        'condition',
        'notes',
    ];

    protected $casts = [
        'harvest_date' => 'date',
        'quantity' => 'integer',
        'weight' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CultivationBatch::class, 'batch_id');
    }
}
