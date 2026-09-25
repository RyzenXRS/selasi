<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'buyer_id',
        'cultivator_id',
        'order_number',
        'total_price',
        'delivery_address',
        'notes',
        'payment_method',
        'payment_type',
        'payment_status',
        'paid_at',
        'payment_proof',
        'snap_token',
        'snap_redirect_url',
        'order_status',
        'cancellation_reason',
        'cancelled_at',
        'completed_at',
    ];

    protected $casts = [
        'total_price' => 'float',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function cultivator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cultivator_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
