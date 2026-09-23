<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CultivationBatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'batch_code',
        'seed_date',
        'plant_quantity',
        'current_phase',
        'location',
        'plant_condition',
        'water_condition',
        'nutrition_condition',
        'installation_condition',
        'environment_condition',
        'notes',
        'status',
        'harvested_at',
    ];

    protected $casts = [
        'seed_date' => 'date',
        'harvested_at' => 'datetime',
        'plant_quantity' => 'integer',
    ];

    public function cultivator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function checks(): HasMany
    {
        return $this->hasMany(CultivationCheck::class, 'batch_id');
    }

    public function phaseHistories(): HasMany
    {
        return $this->hasMany(PhaseHistory::class, 'batch_id');
    }

    public function harvests(): HasMany
    {
        return $this->hasMany(Harvest::class, 'batch_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'batch_id');
    }
}
