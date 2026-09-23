<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhaseHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'previous_phase',
        'next_phase',
        'moved_date',
        'plant_quantity',
        'destination_location',
        'notes',
    ];

    protected $casts = [
        'moved_date' => 'date',
        'plant_quantity' => 'integer',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CultivationBatch::class, 'batch_id');
    }
}
